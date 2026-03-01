"""
PKI management endpoints.

Handles:
- CA initialization
- CA info retrieval
- CRL info
"""

from fastapi import APIRouter, Depends, HTTPException, status

from ..config import get_settings, Settings
from ..dependencies import (
    get_current_user,
    get_certificate_authority,
    get_crl_manager,
    get_supabase_service,
    CurrentUser
)
from ..crypto.ca import CertificateAuthority
from ..crypto.crl import CRLManager
from ..services.supabase import SupabaseService
from ..models.schemas import (
    PKISetupRequest,
    PKISetupResponse,
    CAInfoResponse
)


router = APIRouter(prefix="/pki", tags=["PKI"])


@router.post("/init", response_model=PKISetupResponse)
async def init_pki(
    settings: Settings = Depends(get_settings)
):
    """
    Initialize PKI infrastructure (no authentication required).
    
    This endpoint is for initial setup only. It creates the CA if it doesn't exist.
    Safe to call multiple times - will not overwrite existing CA.
    """
    try:
        ca_key_exists = settings.ca_key_full_path.exists()
        ca_cert_exists = settings.ca_cert_full_path.exists()
        
        if ca_key_exists and ca_cert_exists:
            # Load existing CA
            ca = CertificateAuthority(
                ca_key_path=settings.ca_key_full_path,
                ca_cert_path=settings.ca_cert_full_path
            )
            return PKISetupResponse(
                success=True,
                message="PKI already initialized",
                ca_info=ca.get_ca_info()
            )
        
        # Create new CA
        ca = CertificateAuthority(
            ca_key_path=settings.ca_key_full_path,
            ca_cert_path=settings.ca_cert_full_path,
            common_name=settings.ca_common_name,
            organization=settings.ca_organization,
            country=settings.ca_country,
            state=settings.ca_state,
            validity_days=settings.ca_validity_days
        )
        
        return PKISetupResponse(
            success=True,
            message="PKI infrastructure initialized successfully",
            ca_info=ca.get_ca_info()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize PKI: {str(e)}"
        )


@router.post("/setup", response_model=PKISetupResponse)
async def setup_pki(
    request: PKISetupRequest,
    current_user: CurrentUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Initialize or reinitialize the PKI infrastructure.
    
    This endpoint:
    1. Creates a new Certificate Authority if not exists
    2. Generates CA key pair (RSA-2048)
    3. Creates self-signed CA certificate
    
    Note: In production, this should be admin-only.
    """
    try:
        # Check if CA already exists
        ca_key_exists = settings.ca_key_full_path.exists()
        ca_cert_exists = settings.ca_cert_full_path.exists()
        
        if ca_key_exists and ca_cert_exists and not request.force:
            # Load existing CA
            ca = CertificateAuthority(
                ca_key_path=settings.ca_key_full_path,
                ca_cert_path=settings.ca_cert_full_path
            )
            
            # Log the action
            await supabase.create_audit_log(
                actor_id=current_user.user_id,
                action="pki_setup",
                result="existing",
                details={"message": "PKI already initialized"}
            )
            
            return PKISetupResponse(
                success=True,
                message="PKI already initialized",
                ca_info=ca.get_ca_info()
            )
        
        # Create new CA
        ca = CertificateAuthority(
            ca_key_path=settings.ca_key_full_path,
            ca_cert_path=settings.ca_cert_full_path,
            common_name=settings.ca_common_name,
            organization=settings.ca_organization,
            country=settings.ca_country,
            state=settings.ca_state,
            validity_days=settings.ca_validity_days
        )
        
        # Log the action
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="pki_setup",
            result="success",
            details={"message": "PKI initialized", "ca_info": ca.get_ca_info()}
        )
        
        return PKISetupResponse(
            success=True,
            message="PKI infrastructure initialized successfully",
            ca_info=ca.get_ca_info()
        )
        
    except Exception as e:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="pki_setup",
            result="failure",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize PKI: {str(e)}"
        )


@router.get("/info", response_model=CAInfoResponse)
async def get_pki_info(
    settings: Settings = Depends(get_settings)
):
    """
    Get CA and CRL information.
    
    This is a public endpoint for verification purposes.
    """
    try:
        ca_initialized = (
            settings.ca_key_full_path.exists() and 
            settings.ca_cert_full_path.exists()
        )
        
        if not ca_initialized:
            return CAInfoResponse(
                initialized=False,
                ca_info=None,
                crl_info=None
            )
        
        # Load CA
        ca = CertificateAuthority(
            ca_key_path=settings.ca_key_full_path,
            ca_cert_path=settings.ca_cert_full_path
        )
        
        # Load CRL if exists
        crl_info = None
        if settings.crl_full_path.with_suffix('.json').exists():
            crl = CRLManager(
                crl_path=settings.crl_full_path,
                ca_private_key=ca._private_key,
                ca_certificate=ca._certificate
            )
            crl_info = crl.get_crl_info()
        
        return CAInfoResponse(
            initialized=True,
            ca_info=ca.get_ca_info(),
            crl_info=crl_info
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get PKI info: {str(e)}"
        )


@router.get("/ca-certificate")
async def get_ca_certificate(
    ca: CertificateAuthority = Depends(get_certificate_authority)
):
    """
    Get the CA certificate in PEM format.
    
    This is needed for clients to verify certificate chains.
    """
    return {
        "certificate_pem": ca.certificate_pem,
        "info": ca.get_ca_info()
    }
