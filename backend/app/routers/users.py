"""
User provisioning endpoints.

Handles:
- Key pair generation
- Certificate issuance
- User crypto status
- Admin user creation (bypasses rate limits)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from ..config import get_settings, Settings
from ..dependencies import (
    get_current_user,
    get_certificate_authority,
    get_key_manager,
    get_supabase_service,
    get_crl_manager,
    CurrentUser
)
from ..crypto.ca import CertificateAuthority, certificate_to_pem, get_certificate_info
from ..crypto.keys import KeyManager
from ..crypto.crl import CRLManager
from ..services.supabase import SupabaseService
from ..models.schemas import (
    UserProvisionRequest,
    UserProvisionResponse,
    CertificateInfo,
    UserCryptoStatus,
    RevokeRequest,
    RevokeResponse
)


router = APIRouter(prefix="/users", tags=["Users"])


class AdminSignupRequest(BaseModel):
    """Request to create a user via admin API (bypasses rate limits)."""
    email: EmailStr
    password: str


class AdminSignupResponse(BaseModel):
    """Response from admin signup."""
    success: bool
    message: str
    user_id: str | None = None
    email: str | None = None


@router.post("/admin-signup", response_model=AdminSignupResponse)
async def admin_signup(
    request: AdminSignupRequest,
    settings: Settings = Depends(get_settings)
):
    """
    Create a new user using the admin API.
    
    This bypasses Supabase's email rate limits by using the service role key.
    The user is automatically confirmed and can sign in immediately.
    
    Note: This endpoint is for development/testing purposes.
    In production, you would want to add proper authorization.
    """
    from supabase import create_client
    
    try:
        # Create admin client with service role key
        supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        
        # Create user with auto-confirmation
        result = supabase.auth.admin.create_user({
            "email": request.email,
            "password": request.password,
            "email_confirm": True  # Auto-confirm the email
        })
        
        return AdminSignupResponse(
            success=True,
            message="User created successfully. You can now sign in.",
            user_id=result.user.id,
            email=result.user.email
        )
        
    except Exception as e:
        error_msg = str(e)
        if "already been registered" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists. Please sign in instead."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {error_msg}"
        )


@router.post("/provision", response_model=UserProvisionResponse)
async def provision_user(
    request: UserProvisionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    ca: CertificateAuthority = Depends(get_certificate_authority),
    key_manager: KeyManager = Depends(get_key_manager),
    supabase: SupabaseService = Depends(get_supabase_service),
    settings: Settings = Depends(get_settings)
):
    """
    Provision a new certificate for the current user.
    
    This endpoint:
    1. Generates RSA-2048 key pair
    2. Creates X.509 certificate signed by CA
    3. Stores encrypted private key in database
    4. Returns certificate info
    
    The private key is encrypted using Fernet before storage.
    """
    try:
        # Check if user already provisioned
        existing = await supabase.get_user_crypto(current_user.user_id)
        if existing:
            # Check if revoked - allow re-provisioning
            if existing.get("status") != "revoked":
                try:
                    from ..crypto.ca import pem_to_certificate
                    cert = pem_to_certificate(existing["cert_pem"])
                    cert_info = get_certificate_info(cert)
                    cert_info_model = CertificateInfo(
                        subject=cert_info["subject"],
                        issuer=cert_info["issuer"],
                        serial_number=cert_info["serial_number"],
                        not_valid_before=cert_info["not_valid_before"],
                        not_valid_after=cert_info["not_valid_after"],
                        fingerprint_sha256=cert_info.get("fingerprint_sha256"),
                        status=existing.get("status", "active")
                    )
                    return UserProvisionResponse(
                        success=True,
                        message="User already provisioned",
                        certificate_serial=existing.get("cert_serial"),
                        certificate_pem=existing.get("cert_pem"),
                        public_key_pem=existing.get("public_key"),
                        expires_at=None,
                        certificate=cert_info_model
                    )
                except Exception:
                    pass
                return UserProvisionResponse(
                    success=True,
                    message="User already provisioned",
                    certificate_serial=existing.get("cert_serial"),
                    certificate_pem=existing.get("cert_pem"),
                    public_key_pem=existing.get("public_key"),
                    expires_at=None,
                )
        
        # Generate key pair
        encrypted_private, public_pem = key_manager.generate_and_serialize()
        
        # Get public key object for certificate
        public_key = key_manager.deserialize_public_key(public_pem)
        
        # Determine common name
        common_name = request.common_name or current_user.email or current_user.user_id
        
        # Issue certificate
        certificate, serial_hex = ca.issue_certificate(
            public_key=public_key,
            common_name=common_name,
            email=current_user.email,
            user_id=current_user.user_id,
            validity_days=settings.user_cert_validity_days
        )
        
        cert_pem = certificate_to_pem(certificate)
        
        # Store in database (create new or replace if revoked)
        if existing and existing.get("status") == "revoked":
            await supabase.replace_user_crypto(
                user_id=current_user.user_id,
                public_key=public_pem,
                private_key_encrypted=encrypted_private,
                cert_pem=cert_pem,
                cert_serial=serial_hex,
                email=current_user.email
            )
        else:
            await supabase.create_user_crypto(
                user_id=current_user.user_id,
                public_key=public_pem,
                private_key_encrypted=encrypted_private,
                cert_pem=cert_pem,
                cert_serial=serial_hex,
                email=current_user.email
            )
        
        # Log the action
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="user_provision",
            result="success",
            details={
                "serial": serial_hex,
                "common_name": common_name
            }
        )
        
        # Build certificate info so frontend can show cert without calling GET /me/certificate
        cert_info = get_certificate_info(certificate)
        cert_info_model = CertificateInfo(
            subject=cert_info["subject"],
            issuer=cert_info["issuer"],
            serial_number=cert_info["serial_number"],
            not_valid_before=cert_info["not_valid_before"],
            not_valid_after=cert_info["not_valid_after"],
            fingerprint_sha256=cert_info.get("fingerprint_sha256"),
            status="active"
        )
        
        return UserProvisionResponse(
            success=True,
            message="User provisioned successfully",
            certificate_serial=serial_hex,
            certificate_pem=cert_pem,
            public_key_pem=public_pem,
            expires_at=certificate.not_valid_after_utc.isoformat(),
            certificate=cert_info_model
        )
        
    except Exception as e:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="user_provision",
            result="failure",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to provision user: {str(e)}"
        )


@router.get("/me/certificate")
async def get_my_certificate(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Get the current user's certificate information.
    """
    user_crypto = await supabase.get_user_crypto(current_user.user_id)
    
    if not user_crypto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User has not been provisioned"
        )
    
    cert_pem_raw = user_crypto.get("cert_pem")
    public_key_raw = user_crypto.get("public_key")
    cert_serial_raw = user_crypto.get("cert_serial")
    if not cert_pem_raw:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Certificate data missing in database (cert_pem empty).",
        )
    try:
        from ..crypto.ca import pem_to_certificate

        cert = pem_to_certificate(cert_pem_raw)
        cert_info = get_certificate_info(cert)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid certificate data: {str(e)}",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load certificate: {str(e)}",
        ) from e

    is_revoked = crl_manager.is_revoked(cert_serial_raw or "")
    status_str = "revoked" if is_revoked else user_crypto.get("status", "active")

    return {
        "provisioned": True,
        "certificate": CertificateInfo(
            subject=cert_info["subject"],
            issuer=cert_info["issuer"],
            serial_number=cert_info["serial_number"],
            not_valid_before=cert_info["not_valid_before"],
            not_valid_after=cert_info["not_valid_after"],
            fingerprint_sha256=cert_info.get("fingerprint_sha256"),
            status=status_str
        ),
        "public_key_pem": public_key_raw or "",
        "certificate_pem": cert_pem_raw,
    }


@router.get("/me/status", response_model=UserCryptoStatus)
async def get_my_status(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Get the current user's cryptographic status.
    """
    user_crypto = await supabase.get_user_crypto(current_user.user_id)
    
    if not user_crypto:
        return UserCryptoStatus(
            provisioned=False,
            certificate=None,
            public_key_pem=None
        )

    cert_pem_raw = user_crypto.get("cert_pem")
    cert_serial_raw = user_crypto.get("cert_serial")
    if not cert_pem_raw:
        return UserCryptoStatus(
            provisioned=False,
            certificate=None,
            public_key_pem=None
        )

    try:
        from ..crypto.ca import pem_to_certificate

        cert = pem_to_certificate(cert_pem_raw)
        cert_info = get_certificate_info(cert)
    except Exception:
        return UserCryptoStatus(
            provisioned=True,
            certificate=None,
            public_key_pem=user_crypto.get("public_key")
        )

    is_revoked = crl_manager.is_revoked(cert_serial_raw or "")
    status_str = "revoked" if is_revoked else user_crypto.get("status", "active")

    return UserCryptoStatus(
        provisioned=True,
        certificate=CertificateInfo(
            subject=cert_info["subject"],
            issuer=cert_info["issuer"],
            serial_number=cert_info["serial_number"],
            not_valid_before=cert_info["not_valid_before"],
            not_valid_after=cert_info["not_valid_after"],
            fingerprint_sha256=cert_info.get("fingerprint_sha256"),
            status=status_str
        ),
        public_key_pem=user_crypto.get("public_key")
    )


@router.post("/revoke", response_model=RevokeResponse)
async def revoke_user(
    request: RevokeRequest,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Revoke a user's certificate.
    
    Can revoke by user_id or serial_number.
    In production, this should be admin-only.
    """
    try:
        serial_to_revoke = None
        target_user_id = None
        
        if request.serial_number:
            serial_to_revoke = request.serial_number
            user_crypto = await supabase.get_user_by_serial(serial_to_revoke)
            if user_crypto:
                target_user_id = user_crypto["supabase_user_id"]
        elif request.user_id:
            target_user_id = request.user_id
            user_crypto = await supabase.get_user_crypto(target_user_id)
            if user_crypto:
                serial_to_revoke = user_crypto["cert_serial"]
        else:
            # Revoke own certificate
            target_user_id = current_user.user_id
            user_crypto = await supabase.get_user_crypto(target_user_id)
            if user_crypto:
                serial_to_revoke = user_crypto["cert_serial"]
        
        if not serial_to_revoke:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Certificate not found"
            )
        
        # Add to CRL
        crl_manager.revoke_certificate(serial_to_revoke, request.reason)
        
        # Update database status
        if target_user_id:
            await supabase.update_user_crypto_status(target_user_id, "revoked")
        
        # Log the action
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="revoke",
            result="success",
            details={
                "revoked_serial": serial_to_revoke,
                "target_user_id": target_user_id,
                "reason": request.reason
            }
        )
        
        return RevokeResponse(
            success=True,
            message="Certificate revoked successfully",
            revoked_serial=serial_to_revoke
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="revoke",
            result="failure",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke certificate: {str(e)}"
        )
