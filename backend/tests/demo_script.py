#!/usr/bin/env python3
"""
Sealionyx Demo Script for Viva

This script demonstrates all the required cryptographic features:
1. PKI Setup and CA initialization
2. User provisioning (Alice and Bob)
3. Content sealing (signing)
4. Bundle verification
5. Tampering detection
6. Certificate revocation
7. Hybrid encryption

Run with: python tests/demo_script.py
"""

import json
import sys
import tempfile
from pathlib import Path
from datetime import datetime

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from cryptography.fernet import Fernet
from app.crypto.keys import KeyManager
from app.crypto.ca import CertificateAuthority, certificate_to_pem, pem_to_certificate
from app.crypto.signing import SigningService
from app.crypto.encryption import EncryptionService
from app.crypto.crl import CRLManager


def print_header(text: str):
    """Print a formatted header."""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)


def print_step(text: str):
    """Print a step indicator."""
    print(f"\n>>> {text}")


def print_success(text: str):
    """Print success message."""
    print(f"  [OK] {text}")


def print_fail(text: str):
    """Print failure message."""
    print(f"  [FAIL] {text}")


def print_info(text: str):
    """Print info message."""
    print(f"  [INFO] {text}")


def main():
    """Run the complete demo."""
    
    print_header("SEALIONYX CRYPTOGRAPHIC DEMO")
    print_info("ST6051CEM Practical Cryptography Coursework")
    print_info(f"Demo run at: {datetime.now().isoformat()}")
    
    # Create temp directory for demo
    temp_dir = tempfile.mkdtemp()
    print_info(f"Working directory: {temp_dir}")
    
    # =========================================================================
    # 1. PKI SETUP
    # =========================================================================
    print_header("1. PKI SETUP - Initialize Certificate Authority")
    
    print_step("Creating Certificate Authority...")
    ca = CertificateAuthority(
        ca_key_path=Path(temp_dir) / "ca_private_key.pem",
        ca_cert_path=Path(temp_dir) / "ca_certificate.pem",
        common_name="Sealionyx Demo CA",
        organization="Sealionyx",
        country="GB",
        state="England",
        validity_days=3650
    )
    
    ca_info = ca.get_ca_info()
    print_success("CA created successfully")
    print_info(f"CA Subject: {ca_info['subject']}")
    print_info(f"CA Serial: {ca_info['serial_number']}")
    print_info(f"CA Valid Until: {ca_info['not_valid_after']}")
    
    # Initialize CRL
    print_step("Initializing Certificate Revocation List...")
    crl = CRLManager(
        crl_path=Path(temp_dir) / "crl.pem",
        ca_private_key=ca._private_key,
        ca_certificate=ca._certificate
    )
    print_success("CRL initialized")
    
    # =========================================================================
    # 2. USER PROVISIONING
    # =========================================================================
    print_header("2. USER PROVISIONING - Create Alice and Bob")
    
    fernet_key = Fernet.generate_key().decode()
    key_manager = KeyManager(fernet_key)
    
    # Provision Alice
    print_step("Provisioning Alice...")
    alice_private, alice_public = key_manager.generate_key_pair()
    alice_cert, alice_serial = ca.issue_certificate(
        public_key=alice_public,
        common_name="alice",
        email="alice@example.com",
        validity_days=365
    )
    print_success(f"Alice provisioned with serial: {alice_serial}")
    
    # Provision Bob
    print_step("Provisioning Bob...")
    bob_private, bob_public = key_manager.generate_key_pair()
    bob_cert, bob_serial = ca.issue_certificate(
        public_key=bob_public,
        common_name="bob",
        email="bob@example.com",
        validity_days=365
    )
    print_success(f"Bob provisioned with serial: {bob_serial}")
    
    # =========================================================================
    # 3. CONTENT SEALING (Alice signs content)
    # =========================================================================
    print_header("3. CONTENT SEALING - Alice signs AI-generated content")
    
    ai_content = b"""This is AI-generated content that needs cryptographic authenticity.
    
    Model: GPT-4
    Generated: 2024-01-15
    Topic: Introduction to Quantum Computing
    
    Quantum computing leverages quantum mechanical phenomena like superposition
    and entanglement to perform computations that would be infeasible for
    classical computers...
    """
    
    print_step("Creating sealed bundle...")
    bundle = SigningService.create_bundle(
        content=ai_content,
        private_key=alice_private,
        certificate=alice_cert,
        metadata={
            "model_name": "GPT-4",
            "content_type": "text/plain",
            "title": "Introduction to Quantum Computing"
        }
    )
    
    print_success("Bundle created successfully")
    print_info(f"Content Hash: {bundle['content_hash'][:32]}...")
    print_info(f"Signature Algorithm: {bundle['metadata']['signature_algorithm']}")
    print_info(f"Timestamp: {bundle['metadata']['timestamp']}")
    
    # Save bundle
    bundle_path = Path(temp_dir) / "sealed_bundle.json"
    bundle_path.write_text(json.dumps(bundle, indent=2))
    print_info(f"Bundle saved to: {bundle_path}")
    
    # =========================================================================
    # 4. BUNDLE VERIFICATION (Bob verifies)
    # =========================================================================
    print_header("4. BUNDLE VERIFICATION - Bob verifies Alice's bundle")
    
    print_step("Loading and verifying bundle...")
    loaded_bundle = json.loads(bundle_path.read_text())
    
    is_valid, details = SigningService.verify_bundle(
        bundle=loaded_bundle,
        content=ai_content,
        ca_certificate=ca.certificate,
        check_revocation=lambda cert: crl.is_certificate_revoked(cert)
    )
    
    if is_valid:
        print_success("VERIFICATION PASSED")
        print_info(f"Certificate Valid: {details['certificate_valid']}")
        print_info(f"Chain Valid: {details['certificate_chain_valid']}")
        print_info(f"Not Revoked: {details['certificate_not_revoked']}")
        print_info(f"Signature Valid: {details['signature_valid']}")
        print_info(f"Hash Valid: {details['hash_valid']}")
        print_info(f"Signer: {details['signer_info']['common_name']}")
    else:
        print_fail("Verification failed unexpectedly")
        return 1
    
    # =========================================================================
    # 5. TAMPERING TEST
    # =========================================================================
    print_header("5. TAMPERING TEST - Modify content and verify")
    
    print_step("Modifying content...")
    tampered_content = b"This content has been TAMPERED with!"
    
    is_valid, details = SigningService.verify_bundle(
        bundle=loaded_bundle,
        content=tampered_content,
        ca_certificate=ca.certificate
    )
    
    if not is_valid:
        print_success("TAMPERING DETECTED - Verification correctly failed")
        print_info(f"Error: {details['errors'][0]}")
    else:
        print_fail("Tampering was not detected!")
        return 1
    
    # =========================================================================
    # 6. CERTIFICATE REVOCATION TEST
    # =========================================================================
    print_header("6. CERTIFICATE REVOCATION TEST - Revoke Alice's certificate")
    
    print_step(f"Revoking Alice's certificate (serial: {alice_serial})...")
    crl.revoke_certificate(alice_serial, "key_compromise")
    print_success("Certificate revoked")
    print_info(f"Revoked certificates: {crl.get_revoked_list()}")
    
    print_step("Verifying bundle with revoked certificate...")
    is_valid, details = SigningService.verify_bundle(
        bundle=loaded_bundle,
        content=ai_content,
        ca_certificate=ca.certificate,
        check_revocation=lambda cert: crl.is_certificate_revoked(cert)
    )
    
    if not is_valid:
        print_success("REVOCATION CHECK PASSED - Verification correctly failed")
        print_info(f"Error: {details['errors'][0]}")
    else:
        print_fail("Revoked certificate was not detected!")
        return 1
    
    # =========================================================================
    # 7. HYBRID ENCRYPTION TEST
    # =========================================================================
    print_header("7. HYBRID ENCRYPTION - Alice encrypts for Bob")
    
    # Un-revoke Alice for this test (normally wouldn't do this)
    crl.unrevoke_certificate(alice_serial)
    
    secret_message = b"This is a confidential message from Alice to Bob."
    
    print_step("Alice encrypts message for Bob...")
    encrypted_bundle = EncryptionService.encrypt_for_recipient(
        content=secret_message,
        recipient_public_key=bob_public,
        sender_info={"user_id": "alice", "email": "alice@example.com"},
        metadata={"message_type": "confidential"}
    )
    
    print_success("Message encrypted")
    print_info(f"Encryption: {encrypted_bundle['encryption']['algorithm']}")
    print_info(f"Key Encryption: {encrypted_bundle['encryption']['key_algorithm']}")
    
    print_step("Bob decrypts message...")
    decrypted = EncryptionService.decrypt_bundle(
        bundle=encrypted_bundle,
        recipient_private_key=bob_private
    )
    
    if decrypted == secret_message:
        print_success("DECRYPTION SUCCESSFUL")
        print_info(f"Decrypted message: {decrypted.decode()}")
    else:
        print_fail("Decryption failed!")
        return 1
    
    print_step("Testing that Alice cannot decrypt Bob's messages...")
    try:
        EncryptionService.decrypt_bundle(
            bundle=encrypted_bundle,
            recipient_private_key=alice_private  # Wrong key!
        )
        print_fail("Alice should not be able to decrypt!")
        return 1
    except Exception as e:
        print_success("Alice correctly cannot decrypt (wrong key)")
    
    # =========================================================================
    # 8. UNAUTHORIZED USER TEST
    # =========================================================================
    print_header("8. UNAUTHORIZED USER TEST - User without certificate")
    
    print_step("Creating unsigned content (no certificate)...")
    
    # Create fake bundle without valid certificate
    fake_bundle = {
        "version": "1.0",
        "content_hash": SigningService.hash_content(b"fake content"),
        "signature": "ZmFrZXNpZ25hdHVyZQ==",  # Base64 of "fakesignature"
        "certificate": "-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----",
        "metadata": {}
    }
    
    print_step("Verifying fake bundle...")
    is_valid, details = SigningService.verify_bundle(
        bundle=fake_bundle,
        ca_certificate=ca.certificate
    )
    
    if not is_valid:
        print_success("FAKE BUNDLE REJECTED")
        print_info(f"Error: {details['errors'][0]}")
    else:
        print_fail("Fake bundle was accepted!")
        return 1
    
    # =========================================================================
    # 9. CERTIFICATE SPOOFING TEST
    # =========================================================================
    print_header("9. CERTIFICATE SPOOFING TEST - Untrusted CA")
    
    print_step("Creating a rogue CA...")
    rogue_ca = CertificateAuthority(
        ca_key_path=Path(temp_dir) / "rogue_ca_key.pem",
        ca_cert_path=Path(temp_dir) / "rogue_ca_cert.pem",
        common_name="Rogue CA",
        organization="Evil Corp"
    )
    
    print_step("Rogue CA issues certificate for 'alice'...")
    rogue_private, rogue_public = key_manager.generate_key_pair()
    rogue_cert, _ = rogue_ca.issue_certificate(
        public_key=rogue_public,
        common_name="alice",  # Impersonating Alice!
        email="alice@example.com"
    )
    
    print_step("Creating bundle with rogue certificate...")
    rogue_bundle = SigningService.create_bundle(
        content=b"Malicious content",
        private_key=rogue_private,
        certificate=rogue_cert
    )
    
    print_step("Verifying rogue bundle against legitimate CA...")
    is_valid, details = SigningService.verify_bundle(
        bundle=rogue_bundle,
        ca_certificate=ca.certificate  # Our legitimate CA
    )
    
    if not is_valid:
        print_success("SPOOFED CERTIFICATE REJECTED")
        print_info(f"Error: {details['errors'][0]}")
    else:
        print_fail("Spoofed certificate was accepted!")
        return 1
    
    # =========================================================================
    # 10. MITM SIMULATION
    # =========================================================================
    print_header("10. MITM SIMULATION - Intercepted and modified bundle")
    
    print_step("Alice creates legitimate bundle...")
    original_content = b"Original financial transaction: Transfer $1000 to Bob"
    original_bundle = SigningService.create_bundle(
        content=original_content,
        private_key=alice_private,
        certificate=alice_cert
    )
    
    print_step("MITM intercepts and modifies the bundle...")
    mitm_bundle = original_bundle.copy()
    # Attacker tries to change the content hash
    tampered = b"Original financial transaction: Transfer $10000 to Attacker"
    mitm_bundle['content_hash'] = SigningService.hash_content(tampered)
    # But can't forge the signature!
    
    print_step("Bob verifies the intercepted bundle...")
    is_valid, details = SigningService.verify_bundle(
        bundle=mitm_bundle,
        ca_certificate=ca.certificate,
        check_revocation=lambda cert: crl.is_certificate_revoked(cert)
    )
    
    if not is_valid:
        print_success("MITM ATTACK DETECTED - Signature verification failed")
        print_info("Attacker cannot forge signature without private key")
    else:
        print_fail("MITM attack not detected!")
        return 1
    
    # =========================================================================
    # SUMMARY
    # =========================================================================
    print_header("DEMO COMPLETE - ALL TESTS PASSED")
    
    print("""
    Summary of Demonstrated Features:
    
    1. PKI Setup
       - Created Certificate Authority with RSA-2048
       - Self-signed CA certificate (10 year validity)
       
    2. User Provisioning  
       - Generated RSA-2048 key pairs for Alice and Bob
       - Issued X.509 certificates signed by CA
       
    3. Content Sealing
       - SHA-256 content hashing
       - RSA-PSS digital signatures
       - Bundle with certificate and metadata
       
    4. Bundle Verification
       - Certificate chain validation
       - Signature verification
       - Hash verification
       
    5. Tampering Detection
       - Modified content detected via hash mismatch
       
    6. Certificate Revocation
       - CRL implementation
       - Revoked certificates fail verification
       
    7. Hybrid Encryption
       - AES-256-GCM for content
       - RSA-OAEP for key encapsulation
       - Only intended recipient can decrypt
       
    8. Unauthorized User Detection
       - Invalid certificates rejected
       
    9. Certificate Spoofing Detection
       - Untrusted CA certificates rejected
       
    10. MITM Attack Detection
        - Signature verification prevents tampering
    
    Security Guarantees:
    - Confidentiality (AES-256-GCM encryption)
    - Integrity (SHA-256 + RSA-PSS)
    - Authentication (X.509 certificates)
    - Non-repudiation (Digital signatures + audit trail)
    """)
    
    # Cleanup
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
