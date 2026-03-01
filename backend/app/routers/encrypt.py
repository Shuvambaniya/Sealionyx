"""
Encryption/decryption endpoints.

Handles:
- Hybrid encryption (AES-256-GCM + RSA-OAEP)
- Encrypting content for specific recipients
- Decrypting content
"""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import (
    require_provisioned_user,
    get_supabase_service,
    get_key_manager,
    get_crl_manager,
    get_certificate_authority,
    CurrentUser
)
from ..crypto.encryption import EncryptionService
from ..crypto.signing import SigningService
from ..crypto.ca import pem_to_certificate, certificate_to_pem
from ..crypto.keys import KeyManager
from ..crypto.crl import CRLManager
from ..services.supabase import SupabaseService
from ..models.schemas import (
    EncryptRequest,
    EncryptResponse,
    DecryptRequest,
    DecryptResponse
)


router = APIRouter(prefix="/encrypt", tags=["Encryption"])


@router.post("", response_model=EncryptResponse)
async def encrypt_content(
    request: EncryptRequest,
    current_user: CurrentUser = Depends(require_provisioned_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    key_manager: KeyManager = Depends(get_key_manager),
    crl_manager: CRLManager = Depends(get_crl_manager)
):
    """
    Encrypt content for a specific recipient using hybrid encryption.
    
    Process:
    1. Look up recipient's public key/certificate
    2. Generate random AES-256 key
    3. Encrypt content with AES-256-GCM
    4. Encrypt AES key with recipient's RSA public key (RSA-OAEP)
    5. Optionally sign the content first
    
    Only the recipient with the corresponding private key can decrypt.
    """
    try:
        # Find recipient
        recipient_crypto = None
        
        if request.recipient_email:
            recipient_crypto = await supabase.get_user_by_email(request.recipient_email)
        elif request.recipient_user_id:
            recipient_crypto = await supabase.get_user_crypto(request.recipient_user_id)
        
        if not recipient_crypto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recipient not found or not provisioned"
            )
        
        # Check recipient's certificate status
        if recipient_crypto.get("status") == "revoked":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient's certificate has been revoked"
            )
        
        if crl_manager.is_revoked(recipient_crypto["cert_serial"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recipient's certificate has been revoked"
            )
        
        # Get recipient's public key
        recipient_public_key = key_manager.deserialize_public_key(
            recipient_crypto["public_key"]
        )
        
        # Get sender's crypto data
        sender_crypto = current_user.metadata.get("crypto")
        if not sender_crypto:
            sender_crypto = await supabase.get_user_crypto(current_user.user_id)
        
        content_bytes = request.content.encode('utf-8')
        
        if request.sign:
            # Encrypt with signature
            sender_private_key = key_manager.deserialize_private_key(
                sender_crypto["private_key_encrypted"],
                encrypted=True
            )
            sender_cert = pem_to_certificate(sender_crypto["cert_pem"])
            
            encrypted_bundle = EncryptionService.encrypt_with_signed_bundle(
                content=content_bytes,
                recipient_public_key=recipient_public_key,
                sender_private_key=sender_private_key,
                sender_certificate=sender_cert,
                metadata={
                    "sender_id": current_user.user_id,
                    "recipient_id": recipient_crypto["supabase_user_id"],
                    "encrypted_at": datetime.now(timezone.utc).isoformat()
                }
            )
        else:
            # Encrypt without signature
            encrypted_bundle = EncryptionService.encrypt_for_recipient(
                content=content_bytes,
                recipient_public_key=recipient_public_key,
                sender_info={"user_id": current_user.user_id},
                metadata={
                    "sender_id": current_user.user_id,
                    "recipient_id": recipient_crypto["supabase_user_id"],
                    "encrypted_at": datetime.now(timezone.utc).isoformat()
                }
            )
        
        # Generate bundle ID and store
        bundle_id = str(uuid.uuid4())
        encrypted_bundle["bundle_id"] = bundle_id
        
        # Upload to storage
        bundle_json = json.dumps(encrypted_bundle, indent=2)
        await supabase.upload_bundle(
            bucket="encrypted-bundles",
            path=f"{bundle_id}.json",
            content=bundle_json.encode('utf-8'),
            content_type="application/json"
        )
        
        # Log the action
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="encrypt",
            result="success",
            details={
                "bundle_id": bundle_id,
                "recipient_id": recipient_crypto["supabase_user_id"],
                "signed": request.sign
            }
        )
        
        return EncryptResponse(
            success=True,
            message="Content encrypted successfully",
            encrypted_bundle=encrypted_bundle
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="encrypt",
            result="failure",
            details={"error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Encryption failed: {str(e)}"
        )


@router.post("/decrypt", response_model=DecryptResponse)
async def decrypt_content(
    request: DecryptRequest,
    current_user: CurrentUser = Depends(require_provisioned_user),
    supabase: SupabaseService = Depends(get_supabase_service),
    key_manager: KeyManager = Depends(get_key_manager),
    crl_manager: CRLManager = Depends(get_crl_manager),
    ca=Depends(get_certificate_authority)
):
    """
    Decrypt content that was encrypted for the current user.
    
    Process:
    1. Decrypt AES key using user's RSA private key
    2. Decrypt content using AES-256-GCM
    3. If signed, verify the signature and return seal details
    
    Only the intended recipient can decrypt the content.
    
    Returns clear error codes:
    - INVALID_FORMAT: Bundle format is invalid/corrupted
    - WRONG_RECIPIENT: User's key cannot decrypt (not intended recipient)
    - TAMPERED_DATA: Content was modified/corrupted (GCM auth failed)
    - SIGNATURE_INVALID: Content was sealed but signature verification failed
    - SIGNER_REVOKED: The signer's certificate has been revoked
    """
    encrypted_bundle = request.encrypted_bundle
    
    # Validate bundle format first
    required_fields = ["encrypted_content", "encrypted_key", "nonce"]
    missing_fields = [f for f in required_fields if f not in encrypted_bundle]
    if missing_fields:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="decrypt",
            result="failure",
            details={"error": "Invalid bundle format", "missing_fields": missing_fields}
        )
        return DecryptResponse(
            success=False,
            message="Decryption failed",
            error_code="INVALID_FORMAT",
            error_details="Invalid encrypted bundle format. Missing required fields: " + ", ".join(missing_fields)
        )
    
    try:
        # Get user's private key
        user_crypto = current_user.metadata.get("crypto")
        if not user_crypto:
            user_crypto = await supabase.get_user_crypto(current_user.user_id)
        
        private_key = key_manager.deserialize_private_key(
            user_crypto["private_key_encrypted"],
            encrypted=True
        )
        
        # Decrypt the content
        try:
            decrypted_bytes = EncryptionService.decrypt_bundle(
                bundle=encrypted_bundle,
                recipient_private_key=private_key
            )
        except ValueError as e:
            # Invalid bundle format (base64 decode failed, etc.)
            await supabase.create_audit_log(
                actor_id=current_user.user_id,
                action="decrypt",
                result="failure",
                details={"error": "Invalid bundle format", "details": str(e)}
            )
            return DecryptResponse(
                success=False,
                message="Decryption failed",
                error_code="INVALID_FORMAT",
                error_details="The encrypted bundle format is invalid or corrupted. Please ensure you have the complete, unmodified bundle."
            )
        except Exception as e:
            error_str = str(e).lower()
            # Determine specific error type
            if "invalid tag" in error_str or "authentication" in error_str or "tag" in error_str:
                # GCM authentication failed - data was tampered with
                await supabase.create_audit_log(
                    actor_id=current_user.user_id,
                    action="decrypt",
                    result="failure",
                    details={"error": "Data tampered/corrupted"}
                )
                return DecryptResponse(
                    success=False,
                    message="Decryption failed",
                    error_code="TAMPERED_DATA",
                    error_details="Encrypted data was tampered with or corrupted. The cryptographic integrity check failed, meaning the content has been modified since encryption."
                )
            elif "decryption failed" in error_str or "oaep" in error_str or "decrypt" in error_str:
                # RSA decryption failed - wrong recipient
                await supabase.create_audit_log(
                    actor_id=current_user.user_id,
                    action="decrypt",
                    result="failure",
                    details={"error": "Wrong recipient"}
                )
                return DecryptResponse(
                    success=False,
                    message="Decryption failed",
                    error_code="WRONG_RECIPIENT",
                    error_details="You may not be the intended recipient. This content was encrypted for a different user's public key."
                )
            else:
                # Generic decryption error
                await supabase.create_audit_log(
                    actor_id=current_user.user_id,
                    action="decrypt",
                    result="failure",
                    details={"error": str(e)}
                )
                return DecryptResponse(
                    success=False,
                    message="Decryption failed",
                    error_code="DECRYPTION_ERROR",
                    error_details="Decryption failed. The data may be corrupted or you may not be the intended recipient."
                )
        
        # Check if content was signed/sealed
        was_sealed = encrypted_bundle.get("contains_signature", False)
        sender_info = None
        signature_valid = None
        seal_details = None
        content_hash = None
        
        if was_sealed:
            # The decrypted content is a signed bundle
            try:
                signed_bundle = json.loads(decrypted_bytes.decode('utf-8'))
                
                # Extract the original content from the signed bundle
                import base64
                content_b64 = signed_bundle.get("content")
                content_hash = signed_bundle.get("content_hash")
                
                if content_b64:
                    original_content = base64.b64decode(content_b64)
                    decrypted_content = original_content.decode('utf-8')
                else:
                    # Fallback if content wasn't included (old bundles before fix)
                    decrypted_content = f"[Content not available - hash: {content_hash}]"
                
                # Verify the signature using the extracted content
                is_valid, verify_details = SigningService.verify_bundle(
                    bundle=signed_bundle,
                    content=original_content if content_b64 else None,
                    ca_certificate=ca.certificate,
                    check_revocation=lambda cert: crl_manager.is_certificate_revoked(cert)
                )
                
                signature_valid = is_valid
                sender_info = verify_details.get("signer_info")
                
                # Build comprehensive seal details
                seal_details = {
                    "signature_valid": is_valid,
                    "signer_info": sender_info,
                    "content_hash": content_hash,
                    "sealed_at": signed_bundle.get("metadata", {}).get("timestamp") or signed_bundle.get("metadata", {}).get("sealed_at"),
                    "signature_algorithm": signed_bundle.get("metadata", {}).get("signature_algorithm", "RSA-PSS-SHA256"),
                    "hash_algorithm": signed_bundle.get("metadata", {}).get("hash_algorithm", "SHA-256"),
                    "certificate_chain_valid": verify_details.get("certificate_chain_valid"),
                    "certificate_not_revoked": verify_details.get("certificate_not_revoked"),
                    "verification_errors": verify_details.get("errors", []),
                }
                
                # Additional metadata if present
                bundle_metadata = signed_bundle.get("metadata", {})
                if bundle_metadata.get("model_name"):
                    seal_details["model_name"] = bundle_metadata["model_name"]
                if bundle_metadata.get("title"):
                    seal_details["title"] = bundle_metadata["title"]
                if bundle_metadata.get("content_type"):
                    seal_details["content_type"] = bundle_metadata["content_type"]
                
                # Add content hash to sender_info for display
                if sender_info:
                    sender_info["content_hash"] = content_hash
                else:
                    sender_info = {"content_hash": content_hash}
                
                # Check for specific signature issues
                if not is_valid:
                    errors = verify_details.get("errors", [])
                    if any("revoked" in err.lower() for err in errors):
                        return DecryptResponse(
                            success=True,  # Decryption succeeded, but signature is invalid
                            message="Content decrypted, but the signer's certificate has been revoked",
                            content=decrypted_content,
                            sender_info=sender_info,
                            signature_valid=False,
                            was_sealed=True,
                            seal_details=seal_details,
                            error_code="SIGNER_REVOKED",
                            error_details="The content was decrypted successfully, but the signer's certificate has been revoked. The authenticity cannot be verified."
                        )
                    else:
                        return DecryptResponse(
                            success=True,  # Decryption succeeded, but signature is invalid
                            message="Content decrypted, but signature verification failed",
                            content=decrypted_content,
                            sender_info=sender_info,
                            signature_valid=False,
                            was_sealed=True,
                            seal_details=seal_details,
                            error_code="SIGNATURE_INVALID",
                            error_details="The content was decrypted, but the digital signature could not be verified. The content may have been modified after sealing."
                        )
                
            except json.JSONDecodeError:
                # Content isn't JSON, treat as raw
                decrypted_content = decrypted_bytes.decode('utf-8')
                was_sealed = False  # Can't verify if we can't parse
        else:
            decrypted_content = decrypted_bytes.decode('utf-8')
            sender_info = encrypted_bundle.get("sender")
            # For unsigned bundles, include metadata
            if encrypted_bundle.get("metadata"):
                sender_info = sender_info or {}
                sender_info["encrypted_at"] = encrypted_bundle["metadata"].get("encrypted_at")
                sender_info["sender_id"] = encrypted_bundle["metadata"].get("sender_id")
        
        # Log the successful action
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="decrypt",
            result="success",
            details={
                "bundle_id": encrypted_bundle.get("bundle_id"),
                "was_sealed": was_sealed,
                "signature_valid": signature_valid
            }
        )
        
        return DecryptResponse(
            success=True,
            message="Content decrypted successfully" + (" and signature verified" if signature_valid else ""),
            content=decrypted_content,
            sender_info=sender_info,
            signature_valid=signature_valid,
            was_sealed=was_sealed,
            seal_details=seal_details
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await supabase.create_audit_log(
            actor_id=current_user.user_id,
            action="decrypt",
            result="failure",
            details={"error": str(e)}
        )
        return DecryptResponse(
            success=False,
            message="Decryption failed",
            error_code="INTERNAL_ERROR",
            error_details=f"An unexpected error occurred during decryption: {str(e)}"
        )
