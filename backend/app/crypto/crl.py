"""
Certificate Revocation List (CRL) management for Sealionyx.

Implements:
- CRL generation and maintenance
- Certificate revocation
- Revocation status checking

The CRL is stored as a file and also tracked in the database for redundancy.
"""

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Set, List
import json

from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend


class CRLManager:
    """
    Manages the Certificate Revocation List (CRL).
    
    The CRL is maintained as:
    1. An X.509 CRL file signed by the CA
    2. A JSON file for quick lookups (serial numbers)
    3. Database records via Supabase for persistence
    """
    
    def __init__(
        self,
        crl_path: Path,
        ca_private_key: rsa.RSAPrivateKey,
        ca_certificate: x509.Certificate,
        validity_days: int = 30
    ):
        """
        Initialize the CRL Manager.
        
        Args:
            crl_path: Path to the CRL file
            ca_private_key: CA private key for signing the CRL
            ca_certificate: CA certificate
            validity_days: CRL validity period
        """
        self.crl_path = crl_path
        self.json_path = crl_path.with_suffix('.json')
        self._ca_key = ca_private_key
        self._ca_cert = ca_certificate
        self.validity_days = validity_days
        
        self._revoked_serials: Set[str] = set()
        self._crl: Optional[x509.CertificateRevocationList] = None
        
        # Load or create CRL
        if self.json_path.exists():
            self._load_revoked_serials()
        else:
            self._save_revoked_serials()
    
    def _load_revoked_serials(self) -> None:
        """Load revoked serial numbers from JSON file."""
        try:
            data = json.loads(self.json_path.read_text())
            self._revoked_serials = set(data.get("revoked_serials", []))
        except Exception:
            self._revoked_serials = set()
    
    def _save_revoked_serials(self) -> None:
        """Save revoked serial numbers to JSON file."""
        data = {
            "revoked_serials": list(self._revoked_serials),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        self.json_path.parent.mkdir(parents=True, exist_ok=True)
        self.json_path.write_text(json.dumps(data, indent=2))
    
    def revoke_certificate(
        self,
        serial_number: str,
        reason: str = "unspecified"
    ) -> None:
        """
        Revoke a certificate by serial number.
        
        Args:
            serial_number: Certificate serial number (hex string)
            reason: Revocation reason
        """
        # Normalize serial number
        serial_upper = serial_number.upper()
        
        if serial_upper in self._revoked_serials:
            return  # Already revoked
        
        self._revoked_serials.add(serial_upper)
        self._save_revoked_serials()
        self._regenerate_crl()
    
    def is_revoked(self, serial_number: str) -> bool:
        """
        Check if a certificate is revoked.
        
        Args:
            serial_number: Certificate serial number (hex string)
        
        Returns:
            True if certificate is revoked
        """
        return serial_number.upper() in self._revoked_serials
    
    def is_certificate_revoked(self, cert: x509.Certificate) -> bool:
        """
        Check if a certificate object is revoked.
        
        Args:
            cert: X.509 certificate
        
        Returns:
            True if certificate is revoked
        """
        serial_hex = format(cert.serial_number, 'x').upper()
        return self.is_revoked(serial_hex)
    
    def _regenerate_crl(self) -> None:
        """Regenerate the X.509 CRL file."""
        now = datetime.now(timezone.utc)
        
        builder = (
            x509.CertificateRevocationListBuilder()
            .issuer_name(self._ca_cert.subject)
            .last_update(now)
            .next_update(now + timedelta(days=self.validity_days))
        )
        
        # Add all revoked certificates
        for serial_hex in self._revoked_serials:
            serial_int = int(serial_hex, 16)
            revoked_cert = (
                x509.RevokedCertificateBuilder()
                .serial_number(serial_int)
                .revocation_date(now)
                .build()
            )
            builder = builder.add_revoked_certificate(revoked_cert)
        
        # Sign the CRL
        self._crl = builder.sign(
            private_key=self._ca_key,
            algorithm=hashes.SHA256(),
            backend=default_backend()
        )
        
        # Save CRL to file
        crl_pem = self._crl.public_bytes(serialization.Encoding.PEM)
        self.crl_path.write_bytes(crl_pem)
    
    def get_revoked_list(self) -> List[str]:
        """Get list of all revoked serial numbers."""
        return list(self._revoked_serials)
    
    def get_crl_info(self) -> dict:
        """Get CRL information."""
        return {
            "revoked_count": len(self._revoked_serials),
            "revoked_serials": list(self._revoked_serials),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    
    def unrevoke_certificate(self, serial_number: str) -> bool:
        """
        Remove a certificate from the revocation list.
        
        Note: This is typically not done in production, but useful for testing.
        
        Args:
            serial_number: Certificate serial number (hex string)
        
        Returns:
            True if certificate was unrevoked
        """
        serial_upper = serial_number.upper()
        if serial_upper in self._revoked_serials:
            self._revoked_serials.discard(serial_upper)
            self._save_revoked_serials()
            self._regenerate_crl()
            return True
        return False
