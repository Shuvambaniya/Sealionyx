"""
Unit tests for cryptographic modules.
"""

import pytest
import os
import tempfile
from pathlib import Path

from cryptography.fernet import Fernet

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.crypto.keys import KeyManager, generate_fernet_key
from app.crypto.ca import CertificateAuthority, certificate_to_pem, pem_to_certificate, get_certificate_info
from app.crypto.signing import SigningService
from app.crypto.encryption import EncryptionService
from app.crypto.crl import CRLManager


class TestKeyManager:
    """Tests for key management."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.fernet_key = Fernet.generate_key().decode()
        self.key_manager = KeyManager(self.fernet_key)
    
    def test_generate_key_pair(self):
        """Test RSA key pair generation."""
        private_key, public_key = self.key_manager.generate_key_pair()
        
        assert private_key is not None
        assert public_key is not None
        assert private_key.key_size == 2048
    
    def test_serialize_private_key_encrypted(self):
        """Test private key serialization with encryption."""
        private_key, _ = self.key_manager.generate_key_pair()
        
        encrypted = self.key_manager.serialize_private_key(private_key, encrypt=True)
        
        assert encrypted is not None
        assert len(encrypted) > 0
        # Encrypted keys are base64 encoded
        assert not encrypted.startswith('-----BEGIN')
    
    def test_serialize_private_key_unencrypted(self):
        """Test private key serialization without encryption."""
        private_key, _ = self.key_manager.generate_key_pair()
        
        pem = self.key_manager.serialize_private_key(private_key, encrypt=False)
        
        assert pem.startswith('-----BEGIN PRIVATE KEY-----')
    
    def test_deserialize_private_key_encrypted(self):
        """Test encrypted private key deserialization."""
        private_key, _ = self.key_manager.generate_key_pair()
        
        encrypted = self.key_manager.serialize_private_key(private_key, encrypt=True)
        loaded = self.key_manager.deserialize_private_key(encrypted, encrypted=True)
        
        assert loaded is not None
        assert loaded.key_size == 2048
    
    def test_serialize_public_key(self):
        """Test public key serialization."""
        _, public_key = self.key_manager.generate_key_pair()
        
        pem = self.key_manager.serialize_public_key(public_key)
        
        assert pem.startswith('-----BEGIN PUBLIC KEY-----')
    
    def test_deserialize_public_key(self):
        """Test public key deserialization."""
        _, public_key = self.key_manager.generate_key_pair()
        
        pem = self.key_manager.serialize_public_key(public_key)
        loaded = self.key_manager.deserialize_public_key(pem)
        
        assert loaded is not None
    
    def test_generate_and_serialize(self):
        """Test combined generation and serialization."""
        encrypted_private, public_pem = self.key_manager.generate_and_serialize()
        
        assert encrypted_private is not None
        assert public_pem.startswith('-----BEGIN PUBLIC KEY-----')


class TestCertificateAuthority:
    """Tests for Certificate Authority."""
    
    def setup_method(self):
        """Set up test fixtures with temp directory."""
        self.temp_dir = tempfile.mkdtemp()
        self.ca_key_path = Path(self.temp_dir) / "ca_key.pem"
        self.ca_cert_path = Path(self.temp_dir) / "ca_cert.pem"
        
        self.ca = CertificateAuthority(
            ca_key_path=self.ca_key_path,
            ca_cert_path=self.ca_cert_path,
            common_name="Test CA",
            organization="Test Org",
            country="GB",
            state="Test State",
            validity_days=365
        )
    
    def teardown_method(self):
        """Clean up temp directory."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_ca_creation(self):
        """Test CA is created properly."""
        assert self.ca._private_key is not None
        assert self.ca._certificate is not None
        assert self.ca_key_path.exists()
        assert self.ca_cert_path.exists()
    
    def test_ca_key_permissions(self):
        """Test CA key has restricted permissions."""
        # On Unix systems
        if os.name != 'nt':
            mode = os.stat(self.ca_key_path).st_mode & 0o777
            assert mode == 0o600
    
    def test_issue_certificate(self):
        """Test user certificate issuance."""
        key_manager = KeyManager(Fernet.generate_key().decode())
        _, public_key = key_manager.generate_key_pair()
        
        cert, serial = self.ca.issue_certificate(
            public_key=public_key,
            common_name="test_user",
            email="test@example.com",
            validity_days=30
        )
        
        assert cert is not None
        assert serial is not None
        assert len(serial) > 0
    
    def test_verify_certificate(self):
        """Test certificate verification."""
        key_manager = KeyManager(Fernet.generate_key().decode())
        _, public_key = key_manager.generate_key_pair()
        
        cert, _ = self.ca.issue_certificate(
            public_key=public_key,
            common_name="test_user"
        )
        
        assert self.ca.verify_certificate(cert) is True
    
    def test_certificate_to_pem(self):
        """Test certificate PEM conversion."""
        key_manager = KeyManager(Fernet.generate_key().decode())
        _, public_key = key_manager.generate_key_pair()
        
        cert, _ = self.ca.issue_certificate(
            public_key=public_key,
            common_name="test_user"
        )
        
        pem = certificate_to_pem(cert)
        assert pem.startswith('-----BEGIN CERTIFICATE-----')
        
        loaded = pem_to_certificate(pem)
        assert loaded is not None
    
    def test_get_ca_info(self):
        """Test CA info retrieval."""
        info = self.ca.get_ca_info()
        
        assert 'subject' in info
        assert 'issuer' in info
        assert 'serial_number' in info
        assert 'Test CA' in info['subject']


class TestSigningService:
    """Tests for digital signatures."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.ca = CertificateAuthority(
            ca_key_path=Path(self.temp_dir) / "ca_key.pem",
            ca_cert_path=Path(self.temp_dir) / "ca_cert.pem"
        )
        
        self.key_manager = KeyManager(Fernet.generate_key().decode())
        self.private_key, self.public_key = self.key_manager.generate_key_pair()
        
        self.cert, _ = self.ca.issue_certificate(
            public_key=self.public_key,
            common_name="test_signer"
        )
    
    def teardown_method(self):
        """Clean up."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_hash_content(self):
        """Test SHA-256 hashing."""
        content = b"Hello, World!"
        hash1 = SigningService.hash_content(content)
        hash2 = SigningService.hash_content(content)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 = 64 hex chars
    
    def test_sign_and_verify(self):
        """Test signing and verification."""
        content = b"Test content for signing"
        hash_hex = SigningService.hash_content(content)
        
        signature = SigningService.sign_hash(hash_hex, self.private_key)
        
        assert signature is not None
        assert len(signature) > 0
        
        is_valid = SigningService.verify_signature(hash_hex, signature, self.public_key)
        assert is_valid is True
    
    def test_signature_fails_on_tamper(self):
        """Test that signature fails on tampered content."""
        content = b"Original content"
        hash_hex = SigningService.hash_content(content)
        
        signature = SigningService.sign_hash(hash_hex, self.private_key)
        
        tampered_hash = SigningService.hash_content(b"Tampered content")
        is_valid = SigningService.verify_signature(tampered_hash, signature, self.public_key)
        
        assert is_valid is False
    
    def test_create_bundle(self):
        """Test bundle creation."""
        content = b"AI-generated content"
        
        bundle = SigningService.create_bundle(
            content=content,
            private_key=self.private_key,
            certificate=self.cert,
            metadata={"model": "GPT-4"}
        )
        
        assert 'version' in bundle
        assert 'content_hash' in bundle
        assert 'signature' in bundle
        assert 'certificate' in bundle
        assert 'metadata' in bundle
        assert bundle['metadata']['model'] == 'GPT-4'
    
    def test_verify_bundle(self):
        """Test bundle verification."""
        content = b"AI-generated content"
        
        bundle = SigningService.create_bundle(
            content=content,
            private_key=self.private_key,
            certificate=self.cert
        )
        
        is_valid, details = SigningService.verify_bundle(
            bundle=bundle,
            content=content,
            ca_certificate=self.ca.certificate
        )
        
        assert is_valid is True
        assert details['certificate_valid'] is True
        assert details['signature_valid'] is True
        assert details['hash_valid'] is True
    
    def test_verify_bundle_fails_on_tamper(self):
        """Test bundle verification fails on tampered content."""
        content = b"Original content"
        
        bundle = SigningService.create_bundle(
            content=content,
            private_key=self.private_key,
            certificate=self.cert
        )
        
        tampered_content = b"Tampered content"
        
        is_valid, details = SigningService.verify_bundle(
            bundle=bundle,
            content=tampered_content,
            ca_certificate=self.ca.certificate
        )
        
        assert is_valid is False
        assert 'tampered' in str(details['errors']).lower()


class TestEncryptionService:
    """Tests for hybrid encryption."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.key_manager = KeyManager(Fernet.generate_key().decode())
        self.private_key, self.public_key = self.key_manager.generate_key_pair()
    
    def test_generate_aes_key(self):
        """Test AES key generation."""
        key = EncryptionService.generate_aes_key()
        
        assert len(key) == 32  # 256 bits
    
    def test_aes_encrypt_decrypt(self):
        """Test AES-GCM encryption/decryption."""
        content = b"Secret message"
        key = EncryptionService.generate_aes_key()
        nonce = EncryptionService.generate_nonce()
        
        ciphertext = EncryptionService.encrypt_content_aes(content, key, nonce)
        plaintext = EncryptionService.decrypt_content_aes(ciphertext, key, nonce)
        
        assert plaintext == content
    
    def test_rsa_key_encryption(self):
        """Test RSA-OAEP key encryption."""
        aes_key = EncryptionService.generate_aes_key()
        
        encrypted_key = EncryptionService.encrypt_key_rsa(aes_key, self.public_key)
        decrypted_key = EncryptionService.decrypt_key_rsa(encrypted_key, self.private_key)
        
        assert decrypted_key == aes_key
    
    def test_hybrid_encrypt_decrypt(self):
        """Test full hybrid encryption flow."""
        content = b"Confidential AI output"
        
        encrypted_bundle = EncryptionService.encrypt_for_recipient(
            content=content,
            recipient_public_key=self.public_key,
            sender_info={"user_id": "sender123"},
            metadata={"type": "ai_output"}
        )
        
        assert 'encrypted_content' in encrypted_bundle
        assert 'encrypted_key' in encrypted_bundle
        assert 'nonce' in encrypted_bundle
        
        decrypted = EncryptionService.decrypt_bundle(
            bundle=encrypted_bundle,
            recipient_private_key=self.private_key
        )
        
        assert decrypted == content


class TestCRLManager:
    """Tests for Certificate Revocation List."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        
        self.ca = CertificateAuthority(
            ca_key_path=Path(self.temp_dir) / "ca_key.pem",
            ca_cert_path=Path(self.temp_dir) / "ca_cert.pem"
        )
        
        self.crl_path = Path(self.temp_dir) / "crl.pem"
        self.crl = CRLManager(
            crl_path=self.crl_path,
            ca_private_key=self.ca._private_key,
            ca_certificate=self.ca._certificate
        )
    
    def teardown_method(self):
        """Clean up."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_revoke_certificate(self):
        """Test certificate revocation."""
        serial = "ABC123DEF456"
        
        self.crl.revoke_certificate(serial, "key_compromise")
        
        assert self.crl.is_revoked(serial) is True
        assert self.crl.is_revoked("OTHER123") is False
    
    def test_revoke_is_case_insensitive(self):
        """Test serial number case insensitivity."""
        self.crl.revoke_certificate("abc123", "test")
        
        assert self.crl.is_revoked("ABC123") is True
        assert self.crl.is_revoked("abc123") is True
    
    def test_get_revoked_list(self):
        """Test getting revoked list."""
        self.crl.revoke_certificate("SERIAL1")
        self.crl.revoke_certificate("SERIAL2")
        
        revoked = self.crl.get_revoked_list()
        
        assert len(revoked) == 2
        assert "SERIAL1" in revoked
        assert "SERIAL2" in revoked


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
