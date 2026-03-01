"""
Hybrid encryption for Sealionyx.

Implements:
- AES-256-GCM for content encryption (confidentiality + integrity)
- RSA-OAEP for key encapsulation

This provides:
- Confidentiality: Content encrypted with AES-256-GCM
- Integrity: GCM authentication tag
- Key Security: AES key encrypted with recipient's RSA public key

Workflow:
1. Generate random AES-256 key
2. Encrypt content with AES-256-GCM
3. Encrypt AES key with recipient's RSA-OAEP public key
4. Bundle encrypted content + encrypted key + IV + auth tag
"""

import base64
import os
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend


class EncryptionService:
    """
    Hybrid encryption service using AES-256-GCM + RSA-OAEP.
    
    AES-256-GCM provides authenticated encryption:
    - 256-bit key for strong encryption
    - GCM mode provides confidentiality and integrity
    - 96-bit nonce (IV)
    - 128-bit authentication tag
    
    RSA-OAEP provides key encapsulation:
    - Optimal Asymmetric Encryption Padding
    - SHA-256 for both hash and MGF
    - Secure key wrapping
    """
    
    AES_KEY_SIZE = 32  # 256 bits
    NONCE_SIZE = 12    # 96 bits (recommended for GCM)
    
    @staticmethod
    def generate_aes_key() -> bytes:
        """Generate a random AES-256 key."""
        return os.urandom(EncryptionService.AES_KEY_SIZE)
    
    @staticmethod
    def generate_nonce() -> bytes:
        """Generate a random nonce for AES-GCM."""
        return os.urandom(EncryptionService.NONCE_SIZE)
    
    @staticmethod
    def encrypt_content_aes(
        content: bytes,
        key: bytes,
        nonce: bytes,
        associated_data: Optional[bytes] = None
    ) -> bytes:
        """
        Encrypt content with AES-256-GCM.
        
        Args:
            content: Plaintext content
            key: AES-256 key (32 bytes)
            nonce: Nonce/IV (12 bytes)
            associated_data: Additional authenticated data (optional)
        
        Returns:
            Ciphertext with appended authentication tag
        """
        aesgcm = AESGCM(key)
        return aesgcm.encrypt(nonce, content, associated_data)
    
    @staticmethod
    def decrypt_content_aes(
        ciphertext: bytes,
        key: bytes,
        nonce: bytes,
        associated_data: Optional[bytes] = None
    ) -> bytes:
        """
        Decrypt content encrypted with AES-256-GCM.
        
        Args:
            ciphertext: Ciphertext with authentication tag
            key: AES-256 key (32 bytes)
            nonce: Nonce/IV used during encryption
            associated_data: Additional authenticated data (if used during encryption)
        
        Returns:
            Decrypted plaintext
        
        Raises:
            InvalidTag: If authentication fails (tampered data or wrong key)
        """
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, associated_data)
    
    @staticmethod
    def encrypt_key_rsa(
        aes_key: bytes,
        recipient_public_key: rsa.RSAPublicKey
    ) -> bytes:
        """
        Encrypt AES key with RSA-OAEP.
        
        Args:
            aes_key: AES key to encrypt
            recipient_public_key: Recipient's RSA public key
        
        Returns:
            Encrypted key bytes
        """
        encrypted_key = recipient_public_key.encrypt(
            aes_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return encrypted_key
    
    @staticmethod
    def decrypt_key_rsa(
        encrypted_key: bytes,
        recipient_private_key: rsa.RSAPrivateKey
    ) -> bytes:
        """
        Decrypt AES key with RSA-OAEP.
        
        Args:
            encrypted_key: Encrypted AES key
            recipient_private_key: Recipient's RSA private key
        
        Returns:
            Decrypted AES key
        """
        aes_key = recipient_private_key.decrypt(
            encrypted_key,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return aes_key
    
    @staticmethod
    def encrypt_for_recipient(
        content: bytes,
        recipient_public_key: rsa.RSAPublicKey,
        sender_info: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Encrypt content for a specific recipient using hybrid encryption.
        
        Args:
            content: Plaintext content to encrypt
            recipient_public_key: Recipient's RSA public key
            sender_info: Info about sender (optional)
            metadata: Additional metadata (optional)
        
        Returns:
            Encrypted bundle dictionary
        """
        # Generate random AES key and nonce
        aes_key = EncryptionService.generate_aes_key()
        nonce = EncryptionService.generate_nonce()
        
        # Encrypt content with AES-GCM
        ciphertext = EncryptionService.encrypt_content_aes(content, aes_key, nonce)
        
        # Encrypt AES key with recipient's public key
        encrypted_key = EncryptionService.encrypt_key_rsa(aes_key, recipient_public_key)
        
        # Build encrypted bundle
        bundle = {
            "version": "1.0",
            "encryption": {
                "algorithm": "AES-256-GCM",
                "key_algorithm": "RSA-OAEP-SHA256",
            },
            "encrypted_content": base64.b64encode(ciphertext).decode('utf-8'),
            "encrypted_key": base64.b64encode(encrypted_key).decode('utf-8'),
            "nonce": base64.b64encode(nonce).decode('utf-8'),
            "metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **(metadata or {})
            }
        }
        
        if sender_info:
            bundle["sender"] = sender_info
        
        return bundle
    
    @staticmethod
    def decrypt_bundle(
        bundle: Dict[str, Any],
        recipient_private_key: rsa.RSAPrivateKey
    ) -> bytes:
        """
        Decrypt an encrypted bundle.
        
        Args:
            bundle: Encrypted bundle dictionary
            recipient_private_key: Recipient's RSA private key
        
        Returns:
            Decrypted plaintext content
        
        Raises:
            ValueError: If bundle format is invalid
            InvalidTag: If decryption fails (tampered or wrong key)
        """
        try:
            encrypted_content = base64.b64decode(bundle["encrypted_content"])
            encrypted_key = base64.b64decode(bundle["encrypted_key"])
            nonce = base64.b64decode(bundle["nonce"])
        except (KeyError, ValueError) as e:
            raise ValueError(f"Invalid bundle format: {e}")
        
        # Decrypt AES key
        aes_key = EncryptionService.decrypt_key_rsa(encrypted_key, recipient_private_key)
        
        # Decrypt content
        plaintext = EncryptionService.decrypt_content_aes(encrypted_content, aes_key, nonce)
        
        return plaintext
    
    @staticmethod
    def encrypt_with_signed_bundle(
        content: bytes,
        recipient_public_key: rsa.RSAPublicKey,
        sender_private_key: rsa.RSAPrivateKey,
        sender_certificate,  # x509.Certificate
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Encrypt content and include a signature for authenticity.
        
        This combines encryption (confidentiality) with signing (authenticity):
        1. Hash the original content
        2. Sign the hash
        3. Encrypt the content
        4. Bundle everything together
        
        Args:
            content: Plaintext content
            recipient_public_key: Recipient's RSA public key
            sender_private_key: Sender's RSA private key for signing
            sender_certificate: Sender's certificate
            metadata: Additional metadata
        
        Returns:
            Encrypted and signed bundle
        """
        from .signing import SigningService
        from .ca import certificate_to_pem
        
        # Create signed bundle first (for the content)
        # Include the original content so it can be recovered after decryption
        signed_bundle = SigningService.create_bundle(
            content, sender_private_key, sender_certificate, metadata,
            include_content=True  # Include content for encrypted bundles
        )
        
        # Encrypt the signed bundle
        signed_bundle_bytes = json.dumps(signed_bundle).encode('utf-8')
        
        encrypted_bundle = EncryptionService.encrypt_for_recipient(
            signed_bundle_bytes,
            recipient_public_key,
            sender_info={
                "certificate": certificate_to_pem(sender_certificate),
            },
            metadata=metadata
        )
        
        encrypted_bundle["contains_signature"] = True
        
        return encrypted_bundle
