"""
Bundle verification endpoints.

Handles:
- Verifying signed bundles
- Verifying embedded seals in images
- Certificate chain validation
- CRL checking
"""

import base64
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from ..dependencies import (
    get_optional_user,
    get_supabase_service,
    get_certificate_authority,
    get_crl_manager,
    CurrentUser
)
from ..crypto.signing import SigningService
from ..crypto.embedded import EmbeddedSealService
from ..crypto.ca import CertificateAuthority, pem_to_certificate
from ..crypto.crl import CRLManager
from ..services.supabase import SupabaseService
from ..models.schemas import VerifyRequest, VerifyResponse

from typing import Optional, Dict, Any


class VerifyEmbeddedRequest(BaseModel):
    """Request to verify an image with embedded seal."""
    image_data: str = Field(..., description="Base64-encoded image data")


class VerifyEmbeddedResponse(BaseModel):
    """Response for embedded seal verification."""
    valid: bool
    message: str
    seal_found: bool = False
    details: Dict[str, Any] = Field(default_factory=dict)


router = APIRouter(prefix="/verify", tags=["Verification"])


@router.post("", response_model=VerifyResponse)
async def verify_bundle(
    request: VerifyRequest,
    current_user: Optional[CurrentUser] = Depends(get_optional_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    ca: CertificateAuthority = Depends(get_certificate_authority),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Verify a signed bundle.
    
    This is a public endpoint - anyone can verify bundles.
    
    Verification steps:
    1. Parse bundle and extract certificate
    2. Validate certificate chain (issued by our CA)
    3. Check CRL for revocation
    4. Verify RSA-PSS signature
    5. Optionally verify content hash
    
    Returns detailed verification results.
    """
    try:
        bundle = request.bundle
        content = request.content.encode('utf-8') if request.content else None
        
        # Verify the bundle
        is_valid, details = SigningService.verify_bundle(
            bundle=bundle,
            content=content,
            ca_certificate=ca.certificate,
            check_revocation=lambda cert: crl_manager.is_certificate_revoked(cert)
        )
        
        # Log the verification
        actor_id = current_user.user_id if current_user else None
        await supabase.create_audit_log(
            actor_id=actor_id,
            action="verify",
            result="success" if is_valid else "failure",
            details={
                "content_hash": bundle.get("content_hash"),
                "verification_result": details
            }
        )
        
        if is_valid:
            return VerifyResponse(
                valid=True,
                message="Bundle verification successful",
                details=details
            )
        else:
            return VerifyResponse(
                valid=False,
                message="Bundle verification failed",
                details=details
            )
        
    except Exception as e:
        actor_id = current_user.user_id if current_user else None
        await supabase.create_audit_log(
            actor_id=actor_id,
            action="verify",
            result="error",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification failed: {str(e)}"
        )


@router.post("/quick")
async def quick_verify(
    request: VerifyRequest,
    ca: CertificateAuthority = Depends(get_certificate_authority),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Quick verification without database logging.
    
    Useful for high-volume verification scenarios.
    """
    try:
        bundle = request.bundle
        content = request.content.encode('utf-8') if request.content else None
        
        is_valid, details = SigningService.verify_bundle(
            bundle=bundle,
            content=content,
            ca_certificate=ca.certificate,
            check_revocation=lambda cert: crl_manager.is_certificate_revoked(cert)
        )
        
        return {
            "valid": is_valid,
            "details": details
        }
        
    except Exception as e:
        return {
            "valid": False,
            "details": {"errors": [str(e)]}
        }


@router.post("/certificate")
async def verify_certificate(
    certificate_pem: str,
    ca: CertificateAuthority = Depends(get_certificate_authority),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Verify a certificate's validity and revocation status.
    """
    try:
        cert = pem_to_certificate(certificate_pem)
        
        # Verify against CA
        chain_valid = ca.verify_certificate(cert)
        
        # Check revocation
        is_revoked = crl_manager.is_certificate_revoked(cert)
        
        # Get cert info
        from ..crypto.ca import get_certificate_info
        cert_info = get_certificate_info(cert)
        
        return {
            "valid": chain_valid and not is_revoked,
            "chain_valid": chain_valid,
            "revoked": is_revoked,
            "certificate_info": cert_info
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }


@router.post("/embedded", response_model=VerifyEmbeddedResponse)
async def verify_embedded_seal(
    request: VerifyEmbeddedRequest,
    current_user: Optional[CurrentUser] = Depends(get_optional_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    ca: CertificateAuthority = Depends(get_certificate_authority),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Verify an embedded seal in an image.
    
    This is a public endpoint - anyone can verify sealed images.
    
    Verification steps:
    1. Extract embedded seal from image metadata
    2. Verify pixel data hash matches sealed hash
    3. Validate certificate chain (issued by our CA)
    4. Check CRL for revocation
    5. Verify RSA-PSS signature
    
    Returns detailed verification results.
    """
    try:
        # Decode the base64 image data
        try:
            # Handle data URL format (data:image/jpeg;base64,...)
            if request.image_data.startswith('data:'):
                image_data = request.image_data.split(',', 1)[1]
            else:
                image_data = request.image_data
            
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 image data: {str(e)}"
            )
        
        # Verify the embedded seal
        is_valid, details = EmbeddedSealService.verify_embedded_seal(
            image_bytes=image_bytes,
            ca_certificate=ca.certificate,
            check_revocation=lambda cert: crl_manager.is_certificate_revoked(cert)
        )
        
        # Log the verification
        actor_id = current_user.user_id if current_user else None
        await supabase.create_audit_log(
            actor_id=actor_id,
            action="verify_embedded",
            result="success" if is_valid else "failure",
            details={
                "content_hash": details.get("hash_comparison", {}).get("original_hash"),
                "verification_result": details
            }
        )
        
        seal_found = details.get("seal_found", False)
        
        if is_valid:
            return VerifyEmbeddedResponse(
                valid=True,
                message="Image seal verification successful",
                seal_found=seal_found,
                details=details
            )
        else:
            return VerifyEmbeddedResponse(
                valid=False,
                message="Image seal verification failed" if seal_found else "No embedded seal found",
                seal_found=seal_found,
                details=details
            )
        
    except HTTPException:
        raise
    except Exception as e:
        actor_id = current_user.user_id if current_user else None
        await supabase.create_audit_log(
            actor_id=actor_id,
            action="verify_embedded",
            result="error",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Verification failed: {str(e)}"
        )


@router.get("/test-bundle")
async def generate_test_bundle(
    ca: CertificateAuthority = Depends(get_certificate_authority)
):
    """
    Generate a sample test bundle for verification testing.
    
    This endpoint creates a valid signed bundle using the CA's own key.
    This is for TESTING ONLY - real bundles are created by authenticated users.
    """
    from datetime import datetime, timezone
    
    # Create test content
    test_content = "This is a test message signed by Sealionyx for verification testing."
    content_bytes = test_content.encode('utf-8')
    
    # Use CA's certificate and private key for the test
    bundle = SigningService.create_bundle(
        content=content_bytes,
        private_key=ca._private_key,
        certificate=ca.certificate,
        metadata={
            "content_type": "text",
            "model_name": "Test Generator",
            "title": "Sample Test Bundle",
            "sealed_at": datetime.now(timezone.utc).isoformat(),
            "signer_id": "test-system"
        }
    )
    
    return {
        "bundle": bundle,
        "original_content": test_content,
        "instructions": {
            "step_1": "Copy the 'bundle' object and save as bundle.json",
            "step_2": "Upload bundle.json to /verify page - should show PASS",
            "step_3": "Enter different text in 'Original Content' field to test hash mismatch",
            "step_4": "This demonstrates the tampering detection feature"
        }
    }
