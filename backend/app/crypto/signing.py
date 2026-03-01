"""
Digital signature operations for Sealionyx.

Implements:
- RSA-PSS signatures with SHA-256
- Content hashing
- Bundle creation and verification

The signing service creates signed bundles that include:
- Content hash (SHA-256)
- Digital signature (RSA-PSS)
- Signer's certificate
- Metadata (timestamp, model, content type)
"""

import base64
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature

from .ca import pem_to_certificate, certificate_to_pem


class SigningService:
    """
    Handles digital signature operations using RSA-PSS.
    
    RSA-PSS (Probabilistic Signature Scheme) provides:
    - Strong security proofs
    - Randomized signatures (same message produces different signatures)
    - Standard algorithm for document signing
    """
    
    SIGNATURE_ALGORITHM = "RSA-PSS-SHA256"
    HASH_ALGORITHM = "SHA-256"
    
    @staticmethod
    def hash_content(content: bytes) -> str:
        """
        Compute SHA-256 hash of content.
        
        Args:
            content: Raw content bytes
        
        Returns:
            Hex-encoded hash string
        """
        return hashlib.sha256(content).hexdigest()
    
    @staticmethod
    def sign_hash(
        hash_hex: str,
        private_key: rsa.RSAPrivateKey
    ) -> bytes:
        """
        Sign a hash using RSA-PSS.
        
        Args:
            hash_hex: Hex-encoded hash to sign
            private_key: RSA private key for signing
        
        Returns:
            Raw signature bytes
        """
        # Convert hex hash to bytes
        hash_bytes = bytes.fromhex(hash_hex)
        
        # Sign using RSA-PSS with SHA-256
        signature = private_key.sign(
            hash_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        return signature
    
    @staticmethod
    def verify_signature(
        hash_hex: str,
        signature: bytes,
        public_key: rsa.RSAPublicKey
    ) -> bool:
        """
        Verify an RSA-PSS signature.
        
        Args:
            hash_hex: Hex-encoded hash that was signed
            signature: Signature bytes
            public_key: RSA public key of signer
        
        Returns:
            True if signature is valid
        """
        try:
            hash_bytes = bytes.fromhex(hash_hex)
            
            public_key.verify(
                signature,
                hash_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except InvalidSignature:
            return False
        except Exception:
            return False
    
    @staticmethod
    def create_bundle(
        content: bytes,
        private_key: rsa.RSAPrivateKey,
        certificate: x509.Certificate,
        metadata: Optional[Dict[str, Any]] = None,
        include_content: bool = False
    ) -> Dict[str, Any]:
        """
        Create a signed bundle for content.
        
        The bundle contains everything needed to verify authenticity:
        - Content hash
        - Digital signature
        - Signer's certificate
        - Metadata
        - Optionally the original content (for encrypted bundles)
        
        Args:
            content: Raw content to sign
            private_key: Signer's private key
            certificate: Signer's certificate
            metadata: Additional metadata (model, content_type, etc.)
            include_content: If True, include the original content in the bundle
        
        Returns:
            Bundle dictionary ready for JSON serialization
        """
        # Compute hash
        content_hash = SigningService.hash_content(content)
        
        # Sign the hash
        signature = SigningService.sign_hash(content_hash, private_key)
        signature_b64 = base64.b64encode(signature).decode('utf-8')
        
        # Get certificate PEM
        cert_pem = certificate_to_pem(certificate)
        
        # Build metadata
        bundle_metadata = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "signature_algorithm": SigningService.SIGNATURE_ALGORITHM,
            "hash_algorithm": SigningService.HASH_ALGORITHM,
        }
        
        if metadata:
            bundle_metadata.update(metadata)
        
        # Create bundle
        bundle = {
            "version": "1.0",
            "content_hash": content_hash,
            "signature": signature_b64,
            "certificate": cert_pem,
            "metadata": bundle_metadata
        }
        
        # Optionally include original content (for encrypted bundles)
        if include_content:
            bundle["content"] = base64.b64encode(content).decode('utf-8')
        
        return bundle
    
    @staticmethod
    def verify_bundle(
        bundle: Dict[str, Any],
        content: Optional[bytes] = None,
        ca_certificate: Optional[x509.Certificate] = None,
        check_revocation: Optional[callable] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Verify a signed bundle.
        
        Performs the following checks:
        1. Certificate chain validation (if CA cert provided)
        2. Certificate revocation (if check function provided)
        3. Signature verification
        4. Content hash verification (if content provided)
        
        Args:
            bundle: The signed bundle to verify
            content: Original content to verify hash (optional)
            ca_certificate: CA certificate for chain validation (optional)
            check_revocation: Function to check if cert is revoked (optional)
        
        Returns:
            Tuple of (is_valid, details_dict)
        """
        result = {
            "valid": False,
            "certificate_valid": False,
            "certificate_chain_valid": False,
            "certificate_not_revoked": False,
            "signature_valid": False,
            "hash_valid": False,
            "signer_info": None,
            "errors": []
        }
        
        try:
            # Parse bundle
            content_hash = bundle.get("content_hash")
            signature_b64 = bundle.get("signature")
            cert_pem = bundle.get("certificate")
            metadata = bundle.get("metadata", {})
            
            if not all([content_hash, signature_b64, cert_pem]):
                result["errors"].append("Invalid bundle format: missing required fields")
                return False, result
            
            # Load certificate
            try:
                cert = pem_to_certificate(cert_pem)
                result["certificate_valid"] = True
            except Exception as e:
                result["errors"].append(f"Failed to parse certificate: {str(e)}")
                return False, result
            
            # Extract signer info
            subject_dict = {}
            for attr in cert.subject:
                subject_dict[attr.oid._name] = attr.value
            
            issuer_dict = {}
            for attr in cert.issuer:
                issuer_dict[attr.oid._name] = attr.value
            
            result["signer_info"] = {
                "subject": cert.subject.rfc4514_string(),
                "common_name": subject_dict.get("commonName"),
                "email": subject_dict.get("emailAddress"),
                "serial_number": format(cert.serial_number, 'x').upper(),
                "not_valid_before": cert.not_valid_before_utc.isoformat(),
                "not_valid_after": cert.not_valid_after_utc.isoformat(),
                "issuer": cert.issuer.rfc4514_string(),
            }
            
            all_passed = True
            
            # Check certificate validity period
            now = datetime.now(timezone.utc)
            if cert.not_valid_before_utc > now:
                result["errors"].append("Certificate not yet valid")
                all_passed = False
            elif cert.not_valid_after_utc < now:
                result["errors"].append("Certificate has expired")
                all_passed = False
            
            # Verify certificate chain
            if ca_certificate:
                try:
                    from cryptography.hazmat.primitives.asymmetric import padding as asym_padding
                    
                    ca_public_key = ca_certificate.public_key()
                    ca_public_key.verify(
                        cert.signature,
                        cert.tbs_certificate_bytes,
                        asym_padding.PKCS1v15(),
                        cert.signature_hash_algorithm
                    )
                    result["certificate_chain_valid"] = True
                except Exception:
                    ca_subject = ca_certificate.subject.rfc4514_string()
                    cert_issuer = cert.issuer.rfc4514_string()
                    if ca_subject != cert_issuer:
                        result["errors"].append(
                            f"Certificate was issued by a different CA ({cert_issuer}) "
                            f"than the current trusted CA ({ca_subject}). "
                            "The certificate may have been issued before a CA rotation."
                        )
                    else:
                        result["errors"].append("Certificate not signed by trusted CA")
                    all_passed = False
            else:
                result["certificate_chain_valid"] = True
            
            # Check revocation status
            if check_revocation:
                try:
                    if check_revocation(cert):
                        result["errors"].append("Certificate has been revoked")
                        all_passed = False
                    else:
                        result["certificate_not_revoked"] = True
                except Exception:
                    result["certificate_not_revoked"] = True
            else:
                result["certificate_not_revoked"] = True
            
            # Verify signature using the cert's own public key
            try:
                signature = base64.b64decode(signature_b64)
                public_key = cert.public_key()
                
                if not isinstance(public_key, rsa.RSAPublicKey):
                    result["errors"].append("Certificate does not contain an RSA public key")
                    all_passed = False
                elif SigningService.verify_signature(content_hash, signature, public_key):
                    result["signature_valid"] = True
                else:
                    result["errors"].append("Digital signature is invalid — content or signature may have been tampered with")
                    all_passed = False
            except Exception as e:
                result["errors"].append(f"Signature verification error: {str(e)}")
                all_passed = False
            
            # Verify content hash
            if content is not None:
                computed_hash = SigningService.hash_content(content)
                result["hash_comparison"] = {
                    "original_hash": content_hash,
                    "computed_hash": computed_hash,
                    "match": computed_hash == content_hash
                }
                
                if computed_hash == content_hash:
                    result["hash_valid"] = True
                else:
                    result["hash_valid"] = False
                    result["errors"].append("Content modified after sealing. The hash of the provided content does not match the sealed hash.")
                    all_passed = False
            else:
                result["hash_valid"] = True
                result["hash_comparison"] = None
            
            result["valid"] = all_passed
            result["metadata"] = metadata
            
            return all_passed, result
            
        except Exception as e:
            result["errors"].append(f"Verification error: {str(e)}")
            return False, result
