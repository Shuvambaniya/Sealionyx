"""
Content sealing (signing) endpoints.

Handles:
- Creating signed bundles for AI-generated content
- Embedding seals directly into images (EXIF/XMP metadata)
- Storing bundles in Supabase storage
"""

import base64
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import (
    require_provisioned_user,
    get_supabase_service,
    get_key_manager,
    get_crl_manager,
    CurrentUser
)
from ..crypto.signing import SigningService
from ..crypto.embedded import EmbeddedSealService
from ..crypto.ca import pem_to_certificate
from ..crypto.keys import KeyManager
from ..crypto.crl import CRLManager
from ..services.supabase import SupabaseService
from ..models.schemas import SealRequest, SealResponse, EmbeddedSealRequest, EmbeddedSealResponse


router = APIRouter(prefix="/seal", tags=["Sealing"])


@router.post("", response_model=SealResponse)
async def seal_content(
    request: SealRequest,
    current_user: CurrentUser = Depends(require_provisioned_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    key_manager: KeyManager = Depends(get_key_manager),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Seal (digitally sign) content.
    
    Creates a signed bundle containing:
    - SHA-256 hash of content
    - RSA-PSS signature of hash
    - Signer's X.509 certificate
    - Metadata (timestamp, model name, content type)
    
    The bundle can later be verified by anyone with:
    - The bundle
    - The CA certificate
    - Access to CRL
    
    This provides:
    - Integrity: Hash detects tampering
    - Authentication: Certificate identifies signer
    - Non-repudiation: Signature proves signer created it
    """
    try:
        # Get user's crypto data
        user_crypto = current_user.metadata.get("crypto")
        if not user_crypto:
            user_crypto = await supabase.get_user_crypto(current_user.user_id)
        
        if not user_crypto:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not provisioned"
            )
        
        # Check revocation status
        if crl_manager.is_revoked(user_crypto["cert_serial"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your certificate has been revoked"
            )
        
        # Load private key
        private_key = key_manager.deserialize_private_key(
            user_crypto["private_key_encrypted"],
            encrypted=True
        )
        
        # Load certificate
        certificate = pem_to_certificate(user_crypto["cert_pem"])
        
        # Prepare content
        content_bytes = request.content.encode('utf-8')
        
        # Build metadata
        metadata = {
            "content_type": request.content_type,
            "sealed_at": datetime.now(timezone.utc).isoformat(),
            "signer_id": current_user.user_id,
        }
        
        if request.model_name:
            metadata["model_name"] = request.model_name
        if request.title:
            metadata["title"] = request.title
        
        # Create signed bundle
        bundle = SigningService.create_bundle(
            content=content_bytes,
            private_key=private_key,
            certificate=certificate,
            metadata=metadata
        )
        
        # Generate bundle ID
        bundle_id = str(uuid.uuid4())
        bundle["bundle_id"] = bundle_id
        
        # Store document record
        await supabase.create_document(
            owner_id=current_user.user_id,
            content_hash=bundle["content_hash"],
            signature=bundle["signature"],
            bundle_path=f"sealed-bundles/{bundle_id}.json",
            metadata=metadata
        )
        
        # Optionally upload to storage
        bundle_json = json.dumps(bundle, indent=2)
        await supabase.upload_bundle(
            bucket="sealed-bundles",
            path=f"{bundle_id}.json",
            content=bundle_json.encode('utf-8'),
            content_type="application/json"
        )
        
        # Log the action
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="seal",
            result="success",
            details={
                "bundle_id": bundle_id,
                "content_hash": bundle["content_hash"],
                "content_type": request.content_type
            }
        )
        
        return SealResponse(
            success=True,
            message="Content sealed successfully",
            bundle=bundle,
            bundle_id=bundle_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="seal",
            result="failure",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seal content: {str(e)}"
        )


@router.post("/embedded", response_model=EmbeddedSealResponse)
async def seal_image_embedded(
    request: EmbeddedSealRequest,
    current_user: CurrentUser = Depends(require_provisioned_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    key_manager: KeyManager = Depends(get_key_manager),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Seal an image with embedded cryptographic signature.
    
    The signature is embedded directly into the image file's metadata:
    - JPEG: EXIF UserComment field
    - PNG: PNG text chunk
    - WEBP: XMP metadata
    
    This allows the sealed image to be shared and verified without
    requiring a separate bundle.json file.
    
    Provides:
    - Integrity: Hash of pixel data detects tampering
    - Authentication: Certificate identifies signer
    - Non-repudiation: Signature proves signer created it
    - Portability: Seal travels with the image file
    """
    try:
        # Get user's crypto data
        user_crypto = current_user.metadata.get("crypto")
        if not user_crypto:
            user_crypto = await supabase.get_user_crypto(current_user.user_id)
        
        if not user_crypto:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not provisioned"
            )
        
        # Check revocation status
        if crl_manager.is_revoked(user_crypto["cert_serial"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your certificate has been revoked"
            )
        
        # Load private key
        private_key = key_manager.deserialize_private_key(
            user_crypto["private_key_encrypted"],
            encrypted=True
        )
        
        # Load certificate
        certificate = pem_to_certificate(user_crypto["cert_pem"])
        
        # Decode the base64 image data
        try:
            # Handle data URL format (data:image/jpeg;base64,...)
            if request.image_data.startswith('data:'):
                # Extract the base64 part after the comma
                image_data = request.image_data.split(',', 1)[1]
            else:
                image_data = request.image_data
            
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid base64 image data: {str(e)}"
            )
        
        # Build metadata
        metadata = {
            "content_type": request.image_type,
            "sealed_at": datetime.now(timezone.utc).isoformat(),
            "signer_id": current_user.user_id,
            "original_filename": request.image_filename,
        }
        
        if request.model_name:
            metadata["model_name"] = request.model_name
        if request.title:
            metadata["title"] = request.title
        
        # Seal the image with embedded signature
        try:
            sealed_bytes, seal_info = EmbeddedSealService.seal_image(
                image_bytes=image_bytes,
                private_key=private_key,
                certificate=certificate,
                metadata=metadata
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # Generate bundle ID
        bundle_id = str(uuid.uuid4())
        
        # Create filename for sealed image
        name_parts = request.image_filename.rsplit('.', 1)
        if len(name_parts) == 2:
            sealed_filename = f"{name_parts[0]}_sealed.{name_parts[1]}"
        else:
            sealed_filename = f"{request.image_filename}_sealed"
        
        # Store document record
        await supabase.create_document(
            owner_id=current_user.user_id,
            content_hash=seal_info["content_hash"],
            signature=seal_info["signature"],
            bundle_path=f"sealed-images/{bundle_id}_{sealed_filename}",
            metadata={
                **metadata,
                "embedded": True,
                "original_size": len(image_bytes),
                "sealed_size": len(sealed_bytes)
            }
        )
        
        # Upload sealed image to storage
        await supabase.upload_bundle(
            bucket="sealed-bundles",
            path=f"images/{bundle_id}_{sealed_filename}",
            content=sealed_bytes,
            content_type=request.image_type
        )
        
        # Log the action
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="seal_embedded",
            result="success",
            details={
                "bundle_id": bundle_id,
                "content_hash": seal_info["content_hash"],
                "content_type": request.image_type,
                "filename": request.image_filename,
                "embedded": True
            }
        )
        
        # Encode sealed image as base64 for response
        sealed_b64 = base64.b64encode(sealed_bytes).decode('utf-8')
        
        return EmbeddedSealResponse(
            success=True,
            message="Image sealed with embedded signature",
            sealed_image=f"data:{request.image_type};base64,{sealed_b64}",
            sealed_filename=sealed_filename,
            seal_info={
                "content_hash": seal_info["content_hash"],
                "sealed_at": seal_info["sealed_at"],
                "format": seal_info["format"],
                "model_name": request.model_name,
                "title": request.title
            },
            bundle_id=bundle_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="seal_embedded",
            result="failure",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seal image: {str(e)}"
        )


@router.get("/my-bundles")
async def get_my_bundles(
    current_user: CurrentUser = Depends(require_provisioned_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    limit: int = 50
):
    """
    Get all sealed bundles created by the current user.
    """
    documents = await supabase.get_user_documents(current_user.user_id, limit)
    
    return {
        "documents": documents,
        "total": len(documents)
    }
