"""
Embedded seal operations for images and videos.

Implements embedding cryptographic signatures directly into media files
using standard metadata fields (EXIF UserComment for images, XMP for videos).

This allows the seal to travel with the file rather than requiring a separate bundle.json.
"""

import base64
import hashlib
import io
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

from PIL import Image
import piexif

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import rsa

from .signing import SigningService
from .ca import certificate_to_pem, pem_to_certificate


# Maximum signature data size that can be embedded in EXIF UserComment
MAX_EXIF_SIZE = 65535  # EXIF UserComment limit


class EmbeddedSealService:
    """
    Handles embedding and extracting cryptographic seals from media files.
    
    For images (JPEG, PNG, TIFF):
    - Uses EXIF UserComment field to store seal data
    - Stores as JSON containing signature, hash, certificate, metadata
    
    For videos:
    - Uses XMP metadata sidecar (embedded in supported formats)
    - Falls back to returning separate seal file for unsupported formats
    """
    
    SEAL_MARKER = "SEALIONYX_SEAL_V1:"
    
    @staticmethod
    def _compute_image_hash(image_bytes: bytes) -> str:
        """
        Compute hash of raw image pixel data (excluding metadata).
        This ensures the hash remains valid even if other metadata changes.
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB to normalize
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            # Hash the raw pixel data
            pixel_data = img.tobytes()
            return hashlib.sha256(pixel_data).hexdigest()
        except Exception:
            # Fallback to hashing entire file if image parsing fails
            return hashlib.sha256(image_bytes).hexdigest()
    
    @staticmethod
    def _create_seal_data(
        content_hash: str,
        signature_b64: str,
        cert_pem: str,
        metadata: Dict[str, Any]
    ) -> str:
        """Create JSON seal data for embedding."""
        seal_data = {
            "version": "1.0",
            "content_hash": content_hash,
            "signature": signature_b64,
            "certificate": cert_pem,
            "metadata": metadata
        }
        return json.dumps(seal_data, separators=(',', ':'))  # Compact JSON
    
    @staticmethod
    def _parse_seal_data(seal_string: str) -> Optional[Dict[str, Any]]:
        """Parse seal data from embedded string."""
        if not seal_string.startswith(EmbeddedSealService.SEAL_MARKER):
            return None
        
        json_data = seal_string[len(EmbeddedSealService.SEAL_MARKER):]
        try:
            return json.loads(json_data)
        except json.JSONDecodeError:
            return None
    
    @staticmethod
    def seal_image(
        image_bytes: bytes,
        private_key: rsa.RSAPrivateKey,
        certificate: x509.Certificate,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Embed a cryptographic seal into an image file.
        
        Args:
            image_bytes: Raw image file bytes (JPEG, PNG, etc.)
            private_key: Signer's RSA private key
            certificate: Signer's X.509 certificate
            metadata: Additional metadata (model_name, title, etc.)
        
        Returns:
            Tuple of (sealed_image_bytes, seal_info_dict)
        
        Raises:
            ValueError: If image format is not supported
        """
        # Load image
        try:
            img = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise ValueError(f"Failed to load image: {str(e)}")
        
        original_format = img.format
        if original_format not in ('JPEG', 'PNG', 'TIFF', 'WEBP'):
            raise ValueError(f"Unsupported image format: {original_format}. Supported: JPEG, PNG, TIFF, WEBP")
        
        # Compute hash of pixel data (not the file bytes, so it's metadata-independent)
        content_hash = EmbeddedSealService._compute_image_hash(image_bytes)
        
        # Sign the hash
        signature = SigningService.sign_hash(content_hash, private_key)
        signature_b64 = base64.b64encode(signature).decode('utf-8')
        
        # Get certificate PEM
        cert_pem = certificate_to_pem(certificate)
        
        # Build metadata
        seal_metadata = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "signature_algorithm": SigningService.SIGNATURE_ALGORITHM,
            "hash_algorithm": "SHA-256 (pixel data)",
            "original_format": original_format,
        }
        if metadata:
            seal_metadata.update(metadata)
        
        # Create seal data string
        seal_json = EmbeddedSealService._create_seal_data(
            content_hash, signature_b64, cert_pem, seal_metadata
        )
        seal_string = EmbeddedSealService.SEAL_MARKER + seal_json
        
        # Check size limit
        if len(seal_string.encode('utf-8')) > MAX_EXIF_SIZE:
            raise ValueError("Seal data too large to embed in image")
        
        # For JPEG, use EXIF
        if original_format == 'JPEG':
            sealed_bytes = EmbeddedSealService._embed_exif_seal(img, image_bytes, seal_string)
        else:
            # For PNG/WEBP, use PNG text chunks or save as JPEG with EXIF
            sealed_bytes = EmbeddedSealService._embed_png_seal(img, seal_string, original_format)
        
        seal_info = {
            "content_hash": content_hash,
            "signature": signature_b64,
            "sealed_at": seal_metadata["timestamp"],
            "format": original_format,
            "embedded": True
        }
        
        return sealed_bytes, seal_info
    
    @staticmethod
    def _embed_exif_seal(img: Image.Image, original_bytes: bytes, seal_string: str) -> bytes:
        """Embed seal in JPEG EXIF UserComment field."""
        # Try to preserve existing EXIF
        try:
            exif_dict = piexif.load(original_bytes)
        except Exception:
            exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
        
        # Encode seal string for UserComment (ASCII prefix + UTF-8 data)
        # UserComment format: 8-byte charset identifier + data
        user_comment = b'ASCII\x00\x00\x00' + seal_string.encode('utf-8')
        exif_dict["Exif"][piexif.ExifIFD.UserComment] = user_comment
        
        # Add custom software tag
        exif_dict["0th"][piexif.ImageIFD.Software] = "Sealionyx Cryptographic Seal v1.0"
        
        # Dump EXIF bytes
        exif_bytes = piexif.dump(exif_dict)
        
        # Save image with new EXIF
        output = io.BytesIO()
        img.save(output, format='JPEG', exif=exif_bytes, quality=95)
        return output.getvalue()
    
    @staticmethod
    def _embed_png_seal(img: Image.Image, seal_string: str, original_format: str) -> bytes:
        """Embed seal in PNG/WEBP using PIL metadata."""
        from PIL import PngImagePlugin
        
        output = io.BytesIO()
        
        if original_format == 'PNG':
            # Use PNG text chunk
            meta = PngImagePlugin.PngInfo()
            meta.add_text("Sealionyx-Seal", seal_string)
            meta.add_text("Software", "Sealionyx Cryptographic Seal v1.0")
            img.save(output, format='PNG', pnginfo=meta)
        elif original_format == 'WEBP':
            # WebP: save with XMP metadata
            xmp_data = f'''<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:seal="http://sealionyx.io/seal/1.0/">
<seal:SealData>{seal_string}</seal:SealData>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>'''
            img.save(output, format='WEBP', xmp=xmp_data.encode('utf-8'))
        else:
            # TIFF: use ImageDescription tag
            img.save(output, format='TIFF', tiffinfo={270: seal_string})
        
        return output.getvalue()
    
    @staticmethod
    def extract_seal(image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Extract seal data from an image file.
        
        Args:
            image_bytes: Image file bytes
        
        Returns:
            Seal data dictionary if found, None otherwise
        """
        try:
            img = Image.open(io.BytesIO(image_bytes))
        except Exception:
            return None
        
        seal_string = None
        
        # Try EXIF UserComment (JPEG)
        if img.format == 'JPEG':
            try:
                exif_dict = piexif.load(image_bytes)
                user_comment = exif_dict.get("Exif", {}).get(piexif.ExifIFD.UserComment)
                if user_comment:
                    # Skip charset identifier (first 8 bytes)
                    if user_comment[:8] == b'ASCII\x00\x00\x00':
                        seal_string = user_comment[8:].decode('utf-8', errors='ignore')
            except Exception:
                pass
        
        # Try PNG text chunk
        elif img.format == 'PNG':
            seal_string = img.info.get("Sealionyx-Seal")
        
        # Try WEBP XMP
        elif img.format == 'WEBP':
            xmp = img.info.get("xmp")
            if xmp:
                xmp_str = xmp.decode('utf-8') if isinstance(xmp, bytes) else xmp
                # Extract seal data from XMP
                import re
                match = re.search(r'<seal:SealData>(.+?)</seal:SealData>', xmp_str, re.DOTALL)
                if match:
                    seal_string = match.group(1)
        
        # Try TIFF ImageDescription
        elif img.format == 'TIFF':
            seal_string = img.tag_v2.get(270)  # ImageDescription tag
        
        if seal_string:
            return EmbeddedSealService._parse_seal_data(seal_string)
        
        return None
    
    @staticmethod
    def verify_embedded_seal(
        image_bytes: bytes,
        ca_certificate: Optional[x509.Certificate] = None,
        check_revocation: Optional[callable] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Verify an embedded seal in an image.
        
        Args:
            image_bytes: Image file bytes with embedded seal
            ca_certificate: CA certificate for chain validation
            check_revocation: Function to check if cert is revoked
        
        Returns:
            Tuple of (is_valid, details_dict)
        """
        result = {
            "valid": False,
            "seal_found": False,
            "hash_valid": False,
            "signature_valid": False,
            "certificate_chain_valid": False,
            "certificate_not_revoked": False,
            "signer_info": None,
            "errors": []
        }
        
        # Extract seal
        seal_data = EmbeddedSealService.extract_seal(image_bytes)
        if not seal_data:
            result["errors"].append("No embedded seal found in image")
            return False, result
        
        result["seal_found"] = True
        
        # Compute current image hash
        current_hash = EmbeddedSealService._compute_image_hash(image_bytes)
        sealed_hash = seal_data.get("content_hash")
        
        result["hash_comparison"] = {
            "original_hash": sealed_hash,
            "computed_hash": current_hash,
            "match": current_hash == sealed_hash
        }
        
        if current_hash != sealed_hash:
            result["errors"].append("Image has been modified after sealing")
            return False, result
        
        result["hash_valid"] = True
        
        # Use the signing service to verify the rest
        is_valid, verify_result = SigningService.verify_bundle(
            bundle=seal_data,
            content=None,  # Already verified hash
            ca_certificate=ca_certificate,
            check_revocation=check_revocation
        )
        
        # Merge results
        result["signature_valid"] = verify_result.get("signature_valid", False)
        result["certificate_chain_valid"] = verify_result.get("certificate_chain_valid", False)
        result["certificate_not_revoked"] = verify_result.get("certificate_not_revoked", False)
        result["signer_info"] = verify_result.get("signer_info")
        result["metadata"] = seal_data.get("metadata", {})
        result["errors"].extend(verify_result.get("errors", []))
        
        if is_valid and result["hash_valid"]:
            result["valid"] = True
        
        return result["valid"], result
