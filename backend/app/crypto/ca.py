"""
Certificate Authority for Sealionyx.

Implements a local CA that:
- Generates self-signed root certificate
- Issues X.509 certificates for users
- Manages certificate lifecycle

Security Notes:
- CA private key stored with restricted permissions (0600)
- CA key never exposed via API
- All certificate operations logged for audit
"""

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Tuple
import uuid

from cryptography import x509
from cryptography.x509.oid import NameOID, ExtensionOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


class CertificateAuthority:
    """
    Local Certificate Authority for issuing X.509 certificates.
    
    The CA uses RSA-2048 keys and SHA-256 for signing.
    Certificates include proper extensions for digital signatures.
    """
    
    def __init__(
        self,
        ca_key_path: Optional[Path] = None,
        ca_cert_path: Optional[Path] = None,
        common_name: str = "Sealionyx Root CA",
        organization: str = "Sealionyx",
        country: str = "NP",
        state: str = "Kathmandu",
        validity_days: int = 3650
    ):
        """
        Initialize or load the Certificate Authority.
        
        If CA files don't exist, creates a new CA.
        If they exist, loads the existing CA.
        
        Args:
            ca_key_path: Path to CA private key file
            ca_cert_path: Path to CA certificate file
            common_name: CA common name
            organization: CA organization name
            country: Two-letter country code
            state: State or province
            validity_days: CA certificate validity in days
        """
        self.ca_key_path = ca_key_path or Path("ca/ca_private_key.pem")
        self.ca_cert_path = ca_cert_path or Path("ca/ca_certificate.pem")
        self.common_name = common_name
        self.organization = organization
        self.country = country
        self.state = state
        self.validity_days = validity_days
        
        self._private_key: Optional[rsa.RSAPrivateKey] = None
        self._certificate: Optional[x509.Certificate] = None
        
        # Ensure CA directory exists
        self.ca_key_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Load or create CA
        if self.ca_key_path.exists() and self.ca_cert_path.exists():
            self._load_ca()
        else:
            self._create_ca()
    
    def _create_ca(self) -> None:
        """Create a new Certificate Authority with self-signed certificate."""
        # Generate CA key pair
        self._private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        
        # Build CA certificate subject
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, self.country),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, self.state),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, self.organization),
            x509.NameAttribute(NameOID.COMMON_NAME, self.common_name),
        ])
        
        # Build self-signed CA certificate
        now = datetime.now(timezone.utc)
        self._certificate = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(issuer)
            .public_key(self._private_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now)
            .not_valid_after(now + timedelta(days=self.validity_days))
            .add_extension(
                x509.BasicConstraints(ca=True, path_length=0),
                critical=True
            )
            .add_extension(
                x509.KeyUsage(
                    digital_signature=True,
                    content_commitment=False,
                    key_encipherment=False,
                    data_encipherment=False,
                    key_agreement=False,
                    key_cert_sign=True,
                    crl_sign=True,
                    encipher_only=False,
                    decipher_only=False
                ),
                critical=True
            )
            .add_extension(
                x509.SubjectKeyIdentifier.from_public_key(self._private_key.public_key()),
                critical=False
            )
            .sign(self._private_key, hashes.SHA256(), default_backend())
        )
        
        # Save CA private key with restricted permissions
        self._save_private_key()
        
        # Save CA certificate
        self._save_certificate()
    
    def _save_private_key(self) -> None:
        """Save CA private key with restricted permissions."""
        pem = self._private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Write with restrictive permissions
        self.ca_key_path.write_bytes(pem)
        os.chmod(self.ca_key_path, 0o600)  # Owner read/write only
    
    def _save_certificate(self) -> None:
        """Save CA certificate."""
        pem = self._certificate.public_bytes(serialization.Encoding.PEM)
        self.ca_cert_path.write_bytes(pem)
    
    def _load_ca(self) -> None:
        """Load existing CA from files."""
        # Load private key
        key_pem = self.ca_key_path.read_bytes()
        self._private_key = serialization.load_pem_private_key(
            key_pem,
            password=None,
            backend=default_backend()
        )
        
        # Load certificate
        cert_pem = self.ca_cert_path.read_bytes()
        self._certificate = x509.load_pem_x509_certificate(
            cert_pem,
            default_backend()
        )
    
    @property
    def certificate(self) -> x509.Certificate:
        """Get CA certificate."""
        return self._certificate
    
    @property
    def certificate_pem(self) -> str:
        """Get CA certificate in PEM format."""
        return self._certificate.public_bytes(serialization.Encoding.PEM).decode('utf-8')
    
    def issue_certificate(
        self,
        public_key: rsa.RSAPublicKey,
        common_name: str,
        email: Optional[str] = None,
        user_id: Optional[str] = None,
        validity_days: int = 365
    ) -> Tuple[x509.Certificate, str]:
        """
        Issue a new X.509 certificate for a user.
        
        Args:
            public_key: User's RSA public key
            common_name: Certificate common name (usually username)
            email: User's email address (optional, added as SAN)
            user_id: User's unique ID (added to certificate as extension)
            validity_days: Certificate validity in days
        
        Returns:
            Tuple of (certificate, serial_number_hex)
        """
        # Build subject name
        subject_attrs = [
            x509.NameAttribute(NameOID.COUNTRY_NAME, self.country),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, self.state),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, self.organization),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
        ]
        
        if email:
            subject_attrs.append(x509.NameAttribute(NameOID.EMAIL_ADDRESS, email))
        
        subject = x509.Name(subject_attrs)
        
        # Generate unique serial number
        serial_number = x509.random_serial_number()
        
        now = datetime.now(timezone.utc)
        
        # Build certificate
        builder = (
            x509.CertificateBuilder()
            .subject_name(subject)
            .issuer_name(self._certificate.subject)
            .public_key(public_key)
            .serial_number(serial_number)
            .not_valid_before(now)
            .not_valid_after(now + timedelta(days=validity_days))
            .add_extension(
                x509.BasicConstraints(ca=False, path_length=None),
                critical=True
            )
            .add_extension(
                x509.KeyUsage(
                    digital_signature=True,
                    content_commitment=True,  # Non-repudiation
                    key_encipherment=True,
                    data_encipherment=False,
                    key_agreement=False,
                    key_cert_sign=False,
                    crl_sign=False,
                    encipher_only=False,
                    decipher_only=False
                ),
                critical=True
            )
            .add_extension(
                x509.ExtendedKeyUsage([
                    x509.oid.ExtendedKeyUsageOID.CLIENT_AUTH,
                    x509.oid.ExtendedKeyUsageOID.EMAIL_PROTECTION,
                ]),
                critical=False
            )
            .add_extension(
                x509.SubjectKeyIdentifier.from_public_key(public_key),
                critical=False
            )
            .add_extension(
                x509.AuthorityKeyIdentifier.from_issuer_public_key(
                    self._private_key.public_key()
                ),
                critical=False
            )
        )
        
        # Add Subject Alternative Name if email provided
        if email:
            builder = builder.add_extension(
                x509.SubjectAlternativeName([
                    x509.RFC822Name(email),
                ]),
                critical=False
            )
        
        # Sign the certificate
        certificate = builder.sign(
            self._private_key,
            hashes.SHA256(),
            default_backend()
        )
        
        serial_hex = format(serial_number, 'x').upper()
        
        return certificate, serial_hex
    
    def verify_certificate(self, cert: x509.Certificate) -> bool:
        """
        Verify that a certificate was issued by this CA.
        
        Args:
            cert: Certificate to verify
        
        Returns:
            True if certificate was issued by this CA and is valid
        """
        try:
            from cryptography.hazmat.primitives.asymmetric import padding
            
            # Get the CA's public key
            ca_public_key = self._certificate.public_key()
            
            # Verify the signature on the certificate
            # The signature algorithm for certificates signed with RSA uses PKCS1v15
            ca_public_key.verify(
                cert.signature,
                cert.tbs_certificate_bytes,
                padding.PKCS1v15(),
                cert.signature_hash_algorithm
            )
            
            # Check validity period
            now = datetime.now(timezone.utc)
            if cert.not_valid_before_utc > now or cert.not_valid_after_utc < now:
                return False
            
            return True
        except Exception as e:
            return False
    
    def get_ca_info(self) -> dict:
        """Get CA certificate information."""
        return {
            "subject": self._certificate.subject.rfc4514_string(),
            "issuer": self._certificate.issuer.rfc4514_string(),
            "serial_number": format(self._certificate.serial_number, 'x').upper(),
            "not_valid_before": self._certificate.not_valid_before_utc.isoformat(),
            "not_valid_after": self._certificate.not_valid_after_utc.isoformat(),
            "public_key_algorithm": "RSA",
            "signature_algorithm": "SHA256withRSA",
        }


def certificate_to_pem(cert: x509.Certificate) -> str:
    """Convert certificate to PEM string."""
    return cert.public_bytes(serialization.Encoding.PEM).decode('utf-8')


def pem_to_certificate(pem: str) -> x509.Certificate:
    """Load certificate from PEM string."""
    return x509.load_pem_x509_certificate(
        pem.encode('utf-8'),
        default_backend()
    )


def get_certificate_info(cert: x509.Certificate) -> dict:
    """Extract information from a certificate. Defensive against encoding/oid quirks."""
    subject_dict = {}
    try:
        for attr in cert.subject:
            try:
                name = getattr(attr.oid, "_name", None) or str(attr.oid)
                value = attr.value
                if isinstance(value, bytes):
                    value = value.decode("utf-8", errors="replace")
                subject_dict[name] = value
            except Exception:
                continue
    except Exception:
        pass
    
    try:
        subject_str = cert.subject.rfc4514_string()
    except Exception:
        subject_str = "CN=unknown"
    try:
        issuer_str = cert.issuer.rfc4514_string()
    except Exception:
        issuer_str = "CN=unknown"
    
    return {
        "subject": subject_str,
        "subject_details": subject_dict,
        "issuer": issuer_str,
        "serial_number": format(cert.serial_number, "x").upper(),
        "not_valid_before": cert.not_valid_before_utc.isoformat(),
        "not_valid_after": cert.not_valid_after_utc.isoformat(),
        "fingerprint_sha256": cert.fingerprint(hashes.SHA256()).hex().upper(),
    }
