"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, EmailStr


# =============================================================================
# User & Certificate Schemas
# =============================================================================

class UserProvisionRequest(BaseModel):
    """Request to provision a new certificate for a user."""
    common_name: Optional[str] = Field(None, description="Common name for certificate")


class UserProvisionResponse(BaseModel):
    """Response after provisioning user certificate."""
    success: bool
    message: str
    certificate_serial: Optional[str] = None
    certificate_pem: Optional[str] = None
    public_key_pem: Optional[str] = None
    expires_at: Optional[str] = None
    certificate: Optional["CertificateInfo"] = None  # Full cert info so frontend does not need to reload


class CertificateInfo(BaseModel):
    """Certificate information."""
    subject: str
    issuer: str
    serial_number: str
    not_valid_before: str
    not_valid_after: str
    fingerprint_sha256: Optional[str] = None
    status: str = "active"


class UserCryptoStatus(BaseModel):
    """User's cryptographic status."""
    provisioned: bool
    certificate: Optional[CertificateInfo] = None
    public_key_pem: Optional[str] = None


# =============================================================================
# Authentication Schemas
# =============================================================================

class ChallengeRequest(BaseModel):
    """Request for authentication challenge."""
    pass  # No body needed, user ID from JWT


class ChallengeResponse(BaseModel):
    """Authentication challenge."""
    challenge_id: str
    nonce: str
    expires_at: str


class ChallengeVerifyRequest(BaseModel):
    """Request to verify challenge response."""
    challenge_id: str
    signature: str  # Base64-encoded signature of the nonce


class ChallengeVerifyResponse(BaseModel):
    """Challenge verification result."""
    success: bool
    message: str
    authenticated: bool = False
    certificate_info: Optional[CertificateInfo] = None


# =============================================================================
# Signing Schemas
# =============================================================================

class SealRequest(BaseModel):
    """Request to seal (sign) content."""
    content: str = Field(..., description="Content to seal (text)")
    content_type: str = Field("text/plain", description="MIME type of content")
    model_name: Optional[str] = Field(None, description="AI model that generated content")
    title: Optional[str] = Field(None, description="Title/description of content")


class EmbeddedSealRequest(BaseModel):
    """Request to seal an image with embedded signature."""
    image_data: str = Field(..., description="Base64-encoded image data")
    image_filename: str = Field(..., description="Original filename")
    image_type: str = Field(..., description="MIME type (image/jpeg, image/png, etc.)")
    model_name: Optional[str] = Field(None, description="AI model that generated content")
    title: Optional[str] = Field(None, description="Title/description of content")


class SealResponse(BaseModel):
    """Sealed content response."""
    success: bool
    message: str
    bundle: Optional[Dict[str, Any]] = None
    bundle_id: Optional[str] = None


class EmbeddedSealResponse(BaseModel):
    """Embedded seal response - returns the sealed image."""
    success: bool
    message: str
    sealed_image: Optional[str] = None  # Base64-encoded sealed image
    sealed_filename: Optional[str] = None
    seal_info: Optional[Dict[str, Any]] = None  # Hash, timestamp, etc.
    bundle_id: Optional[str] = None


class VerifyRequest(BaseModel):
    """Request to verify a sealed bundle."""
    bundle: Dict[str, Any] = Field(..., description="The sealed bundle to verify")
    content: Optional[str] = Field(None, description="Original content to verify hash")


class VerifyResponse(BaseModel):
    """Verification result."""
    valid: bool
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# Encryption Schemas
# =============================================================================

class EncryptRequest(BaseModel):
    """Request to encrypt content for a recipient."""
    content: str = Field(..., description="Content to encrypt")
    recipient_email: Optional[str] = Field(None, description="Recipient's email")
    recipient_user_id: Optional[str] = Field(None, description="Recipient's user ID")
    sign: bool = Field(True, description="Also sign the content")


class EncryptResponse(BaseModel):
    """Encrypted content response."""
    success: bool
    message: str
    encrypted_bundle: Optional[Dict[str, Any]] = None


class DecryptRequest(BaseModel):
    """Request to decrypt content."""
    encrypted_bundle: Dict[str, Any] = Field(..., description="Encrypted bundle")


class DecryptResponse(BaseModel):
    """Decrypted content response."""
    success: bool
    message: str
    content: Optional[str] = None
    sender_info: Optional[Dict[str, Any]] = None
    signature_valid: Optional[bool] = None
    # Enhanced seal verification details
    was_sealed: Optional[bool] = None  # Whether the content was signed/sealed
    seal_details: Optional[Dict[str, Any]] = None  # Signer info, timestamp, etc.
    error_code: Optional[str] = None  # Specific error code for failures
    error_details: Optional[str] = None  # User-friendly error explanation


# =============================================================================
# Revocation Schemas
# =============================================================================

class RevokeRequest(BaseModel):
    """Request to revoke a certificate."""
    user_id: Optional[str] = Field(None, description="User ID to revoke")
    serial_number: Optional[str] = Field(None, description="Certificate serial to revoke")
    reason: str = Field("unspecified", description="Revocation reason")


class RevokeResponse(BaseModel):
    """Revocation result."""
    success: bool
    message: str
    revoked_serial: Optional[str] = None


# =============================================================================
# PKI Schemas
# =============================================================================

class PKISetupRequest(BaseModel):
    """Request to initialize PKI."""
    force: bool = Field(False, description="Force re-initialization")


class PKISetupResponse(BaseModel):
    """PKI setup result."""
    success: bool
    message: str
    ca_info: Optional[Dict[str, Any]] = None


class CAInfoResponse(BaseModel):
    """CA information."""
    initialized: bool
    ca_info: Optional[Dict[str, Any]] = None
    crl_info: Optional[Dict[str, Any]] = None


# =============================================================================
# Audit Schemas
# =============================================================================

class AuditLogEntry(BaseModel):
    """Single audit log entry."""
    id: str
    actor_id: Optional[str] = None
    action: str
    result: str
    details: Optional[Dict[str, Any]] = None
    created_at: str


class AuditLogResponse(BaseModel):
    """Audit log response."""
    logs: List[AuditLogEntry]
    total: int
    page: int
    page_size: int


# =============================================================================
# Health & Status Schemas
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    pki_initialized: bool
    database_connected: bool


class ErrorResponse(BaseModel):
    """Error response."""
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
