"""
Configuration management for Sealionyx backend.
Uses pydantic-settings for environment variable parsing and validation.
"""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    
    # Cryptographic Secret for encrypting user private keys
    crypto_secret: str
    
    # JWT Configuration
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    
    # Server Settings
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    debug: bool = False
    
    # CORS Origins
    cors_origins: str = "http://localhost:3000"
    
    # CA Configuration
    ca_common_name: str = "Sealionyx Root CA"
    ca_organization: str = "Sealionyx"
    ca_country: str = "NP"
    ca_state: str = "Kathmandu"
    ca_validity_days: int = 3650  # 10 years
    user_cert_validity_days: int = 365  # 1 year
    
    # CA Key Paths (relative to backend directory)
    ca_key_path: str = "ca/ca_private_key.pem"
    ca_cert_path: str = "ca/ca_certificate.pem"
    crl_path: str = "ca/crl.pem"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def ca_key_full_path(self) -> Path:
        """Full path to CA private key."""
        return Path(__file__).parent.parent / self.ca_key_path
    
    @property
    def ca_cert_full_path(self) -> Path:
        """Full path to CA certificate."""
        return Path(__file__).parent.parent / self.ca_cert_path
    
    @property
    def crl_full_path(self) -> Path:
        """Full path to CRL file."""
        return Path(__file__).parent.parent / self.crl_path
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
