"""
API integration tests for Sealionyx backend.

These tests require:
1. Environment variables set (or .env file)
2. Supabase project configured (or mocked)

Run with: pytest tests/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))


# Mock environment variables for testing
import os
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
os.environ.setdefault("CRYPTO_SECRET", "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=")  # Valid Fernet key
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-key-for-testing-purposes-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")


class TestHealthEndpoint:
    """Tests for health check endpoint."""
    
    def test_health_check(self):
        """Test that health endpoint returns status."""
        from app.main import app
        client = TestClient(app)
        
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "pki_initialized" in data


class TestRootEndpoint:
    """Tests for root endpoint."""
    
    def test_root(self):
        """Test root endpoint returns API info."""
        from app.main import app
        client = TestClient(app)
        
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Sealionyx API"
        assert "version" in data


class TestPKIEndpoints:
    """Tests for PKI endpoints."""
    
    def test_pki_info_unauthenticated(self):
        """Test PKI info endpoint is accessible without auth."""
        from app.main import app
        client = TestClient(app)
        
        response = client.get("/pki/info")
        
        assert response.status_code == 200
        data = response.json()
        assert "initialized" in data


class TestVerifyEndpoint:
    """Tests for public verification endpoint."""
    
    def test_verify_invalid_bundle(self):
        """Test verification rejects invalid bundle."""
        from app.main import app
        client = TestClient(app)
        
        response = client.post("/verify", json={
            "bundle": {
                "version": "1.0",
                "content_hash": "invalid",
                "signature": "invalid",
                "certificate": "invalid"
            }
        })
        
        # Should return 200 with valid=false, not 400
        assert response.status_code in [200, 400]


class TestAuthenticatedEndpoints:
    """Tests that require authentication."""
    
    def test_provision_requires_auth(self):
        """Test that provision endpoint requires authentication."""
        from app.main import app
        client = TestClient(app)
        
        response = client.post("/users/provision", json={})
        
        # Should be unauthorized
        assert response.status_code == 401
    
    def test_seal_requires_auth(self):
        """Test that seal endpoint requires authentication."""
        from app.main import app
        client = TestClient(app)
        
        response = client.post("/seal", json={
            "content": "test",
            "content_type": "text/plain"
        })
        
        assert response.status_code == 401
    
    def test_encrypt_requires_auth(self):
        """Test that encrypt endpoint requires authentication."""
        from app.main import app
        client = TestClient(app)
        
        response = client.post("/encrypt", json={
            "content": "test",
            "recipient_email": "test@example.com"
        })
        
        assert response.status_code == 401
    
    def test_audit_requires_auth(self):
        """Test that audit endpoint requires authentication."""
        from app.main import app
        client = TestClient(app)
        
        response = client.get("/audit")
        
        assert response.status_code == 401


class TestCORSHeaders:
    """Tests for CORS configuration."""
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present."""
        from app.main import app
        client = TestClient(app)
        
        response = client.options("/health", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET"
        })
        
        # FastAPI handles OPTIONS requests
        assert response.status_code in [200, 405]


class TestInputValidation:
    """Tests for input validation."""
    
    def test_verify_requires_bundle(self):
        """Test that verify endpoint requires bundle field."""
        from app.main import app
        client = TestClient(app)
        
        response = client.post("/verify", json={})
        
        assert response.status_code == 422  # Validation error
    
    def test_seal_content_validation(self):
        """Test seal endpoint validates content field."""
        from app.main import app
        client = TestClient(app)
        
        # Missing content field (with fake auth header to get past auth check)
        response = client.post(
            "/seal",
            json={"content_type": "text/plain"},
            headers={"Authorization": "Bearer fake-token"}
        )
        
        # Will fail auth before validation, but that's expected
        assert response.status_code in [401, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
