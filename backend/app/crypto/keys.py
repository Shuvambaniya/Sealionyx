"""
Key management for Sealionyx.

Handles:
- RSA-2048 key pair generation
- Secure key storage with Fernet encryption
- Key loading and validation

Security Notes:
- User private keys are encrypted at rest using Fernet
- Fernet provides AES-128-CBC + HMAC-SHA256
- The encryption key is derived from CRYPTO_SECRET environment variable
- Keys are never transmitted or exposed via API
"""

import base64
from typing import Tuple, Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from cryptography.fernet import Fernet, InvalidToken


class KeyManager:
    """
    Manages RSA key pairs with secure storage.
    
    User private keys are encrypted using Fernet before storage.
    This provides authenticated encryption (AES-128-CBC + HMAC-SHA256).
    """
    
    def __init__(self, crypto_secret: str):
        """
        Initialize KeyManager with encryption secret.
        
        Args:
            crypto_secret: Fernet key for encrypting private keys at rest.
                          Generate with: Fernet.generate_key()
        """
        # Ensure the secret is a valid Fernet key
        try:
            self.fernet = Fernet(crypto_secret.encode() if isinstance(crypto_secret, str) else crypto_secret)
        except Exception as e:
            raise ValueError(f"Invalid CRYPTO_SECRET. Must be a valid Fernet key. Error: {e}")
    
    @staticmethod
    def generate_key_pair(key_size: int = 2048) -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
        """
        Generate a new RSA key pair.
        
        Args:
            key_size: RSA key size in bits. Default is 2048 for security/performance balance.
        
        Returns:
            Tuple of (private_key, public_key)
        """
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
            backend=default_backend()
        )
        public_key = private_key.public_key()
        return private_key, public_key
    
    def serialize_private_key(
        self,
        private_key: rsa.RSAPrivateKey,
        encrypt: bool = True
    ) -> str:
        """
        Serialize private key to PEM format, optionally encrypted.
        
        Args:
            private_key: RSA private key to serialize
            encrypt: If True, encrypt the PEM with Fernet
        
        Returns:
            PEM-encoded private key (encrypted if encrypt=True)
        """
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        if encrypt:
            # Encrypt the PEM bytes with Fernet
            encrypted = self.fernet.encrypt(pem)
            return base64.b64encode(encrypted).decode('utf-8')
        
        return pem.decode('utf-8')
    
    def deserialize_private_key(
        self,
        pem_data: str,
        encrypted: bool = True
    ) -> rsa.RSAPrivateKey:
        """
        Deserialize private key from PEM format.
        
        Args:
            pem_data: PEM-encoded private key (possibly encrypted)
            encrypted: If True, decrypt with Fernet first
        
        Returns:
            RSA private key object
        
        Raises:
            InvalidToken: If decryption fails (wrong key or tampered data)
            ValueError: If PEM parsing fails
        """
        if encrypted:
            try:
                encrypted_bytes = base64.b64decode(pem_data.encode('utf-8'))
                pem_bytes = self.fernet.decrypt(encrypted_bytes)
            except InvalidToken:
                raise ValueError("Failed to decrypt private key. Key may be corrupted or wrong encryption key.")
        else:
            pem_bytes = pem_data.encode('utf-8')
        
        private_key = serialization.load_pem_private_key(
            pem_bytes,
            password=None,
            backend=default_backend()
        )
        
        if not isinstance(private_key, rsa.RSAPrivateKey):
            raise ValueError("Loaded key is not an RSA private key")
        
        return private_key
    
    @staticmethod
    def serialize_public_key(public_key: rsa.RSAPublicKey) -> str:
        """
        Serialize public key to PEM format.
        
        Args:
            public_key: RSA public key to serialize
        
        Returns:
            PEM-encoded public key
        """
        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem.decode('utf-8')
    
    @staticmethod
    def deserialize_public_key(pem_data: str) -> rsa.RSAPublicKey:
        """
        Deserialize public key from PEM format.
        
        Args:
            pem_data: PEM-encoded public key
        
        Returns:
            RSA public key object
        """
        public_key = serialization.load_pem_public_key(
            pem_data.encode('utf-8'),
            backend=default_backend()
        )
        
        if not isinstance(public_key, rsa.RSAPublicKey):
            raise ValueError("Loaded key is not an RSA public key")
        
        return public_key
    
    def generate_and_serialize(self) -> Tuple[str, str]:
        """
        Generate a new key pair and serialize both keys.
        
        Returns:
            Tuple of (encrypted_private_key_pem, public_key_pem)
        """
        private_key, public_key = self.generate_key_pair()
        
        encrypted_private = self.serialize_private_key(private_key, encrypt=True)
        public_pem = self.serialize_public_key(public_key)
        
        return encrypted_private, public_pem


# Utility function for generating Fernet keys
def generate_fernet_key() -> str:
    """Generate a new Fernet key for CRYPTO_SECRET."""
    return Fernet.generate_key().decode('utf-8')
