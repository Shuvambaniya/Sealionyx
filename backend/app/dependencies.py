"""
FastAPI dependencies for authentication and service injection.
"""

import jwt
from datetime import datetime, timezone
from typing import Optional
from functools import lru_cache

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import get_settings, Settings
from .services.supabase import SupabaseService
from .crypto.ca import CertificateAuthority
from .crypto.keys import KeyManager
from .crypto.crl import CRLManager


# Security scheme
security = HTTPBearer(auto_error=False)


def get_supabase_service(
    settings: Settings = Depends(get_settings)
) -> SupabaseService:
    """Get Supabase service instance."""
    return SupabaseService(
        url=settings.supabase_url,
        service_role_key=settings.supabase_service_role_key
    )


def get_key_manager(
    settings: Settings = Depends(get_settings)
) -> KeyManager:
    """Get KeyManager instance."""
    return KeyManager(settings.crypto_secret)


def get_certificate_authority(
    settings: Settings = Depends(get_settings)
) -> CertificateAuthority:
    """Get Certificate Authority instance."""
    try:
        return CertificateAuthority(
            ca_key_path=settings.ca_key_full_path,
            ca_cert_path=settings.ca_cert_full_path,
            common_name=settings.ca_common_name,
            organization=settings.ca_organization,
            country=settings.ca_country,
            state=settings.ca_state,
            validity_days=settings.ca_validity_days
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Certificate Authority not initialized. Run PKI setup first (POST /pki/setup) or ensure backend/ca/ directory exists and contains ca_private_key.pem and ca_certificate.pem.",
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Certificate Authority failed to load: {str(e)}. Check that CA key and certificate files are valid PEM format.",
        ) from e


def get_crl_manager(
    settings: Settings = Depends(get_settings),
    ca: CertificateAuthority = Depends(get_certificate_authority)
) -> CRLManager:
    """Get CRL Manager instance."""
    return CRLManager(
        crl_path=settings.crl_full_path,
        ca_private_key=ca._private_key,
        ca_certificate=ca._certificate
    )


class CurrentUser:
    """Represents the current authenticated user."""
    
    def __init__(
        self,
        user_id: str,
        email: Optional[str] = None,
        role: Optional[str] = None,
        metadata: Optional[dict] = None
    ):
        self.user_id = user_id
        self.email = email
        self.role = role
        self.metadata = metadata or {}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings)
) -> CurrentUser:
    """
    Validate JWT token from Supabase and extract user info.
    
    The JWT is issued by Supabase Auth and contains:
    - sub: User ID
    - email: User's email
    - role: User's role
    
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    
    try:
        import base64
        import httpx
        from jwt import PyJWKClient
        
        # Get the token header to determine algorithm
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "")
        
        if alg.startswith("ES") or alg.startswith("RS"):
            # Asymmetric algorithm (ES256, RS256, etc.) - use JWKS
            # Supabase JWKS URL: {SUPABASE_URL}/auth/v1/.well-known/jwks.json
            jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
            
            try:
                jwks_client = PyJWKClient(jwks_url)
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["ES256", "ES384", "ES512", "RS256", "RS384", "RS512"],
                    audience="authenticated"
                )
            except Exception as e:
                print(f"[DEBUG] JWKS verification failed: {e}")
                # Fall back to decoding without signature verification for development
                # WARNING: This is insecure! Only use for debugging.
                if settings.debug:
                    payload = jwt.decode(token, options={"verify_signature": False})
                    print("[DEBUG] WARNING: Token verified without signature check (debug mode)")
                else:
                    raise
        else:
            # Symmetric algorithm (HS256, etc.) - use JWT secret
            try:
                jwt_secret = base64.b64decode(settings.jwt_secret)
            except Exception:
                jwt_secret = settings.jwt_secret.encode() if isinstance(settings.jwt_secret, str) else settings.jwt_secret
            
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256", "HS384", "HS512"],
                audience="authenticated"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
        
        return CurrentUser(
            user_id=user_id,
            email=payload.get("email"),
            role=payload.get("role"),
            metadata=payload.get("user_metadata", {})
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: audience mismatch"
        )
    except jwt.InvalidAlgorithmError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: algorithm not allowed - {str(e)}"
        )
    except jwt.InvalidTokenError as e:
        print(f"[DEBUG] InvalidTokenError: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    settings: Settings = Depends(get_settings)
) -> Optional[CurrentUser]:
    """
    Optionally get current user (for public endpoints).
    
    Returns None if no valid token provided.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, settings)
    except HTTPException:
        return None


async def require_provisioned_user(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    crl_manager: CRLManager = Depends(get_crl_manager)
) -> CurrentUser:
    """
    Require that the current user has been provisioned with a certificate.
    
    Also checks that the certificate is not revoked.
    
    Raises:
        HTTPException: If user is not provisioned or certificate is revoked
    """
    user_crypto = await supabase.get_user_crypto(current_user.user_id)
    
    if not user_crypto:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has not been provisioned with a certificate. Please provision first."
        )
    
    if user_crypto.get("status") == "revoked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User's certificate has been revoked"
        )
    
    # Check CRL
    cert_serial = user_crypto.get("cert_serial")
    if cert_serial and crl_manager.is_revoked(cert_serial):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User's certificate has been revoked"
        )
    
    # Attach crypto info to user
    current_user.metadata["crypto"] = user_crypto
    
    return current_user
