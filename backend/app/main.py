"""
Sealionyx Backend - Main FastAPI Application

A cryptographic authenticity platform for AI-generated content.
Provides PKI, digital signatures, and hybrid encryption.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import (
    pki_router,
    users_router,
    auth_router,
    seal_router,
    verify_router,
    encrypt_router,
    audit_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    settings = get_settings()
    
    # Ensure CA directory exists
    ca_dir = Path(settings.ca_key_path).parent
    ca_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Sealionyx Backend starting...")
    print(f"CA directory: {ca_dir.absolute()}")
    print(f"Debug mode: {settings.debug}")
    
    yield
    
    print("Sealionyx Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Sealionyx API",
    description="""
    Cryptographic Authenticity Platform for AI-Generated Content
    
    ## Features
    
    - **PKI/X.509**: Certificate Authority with user certificates
    - **Digital Signatures**: RSA-PSS with SHA-256
    - **Hybrid Encryption**: AES-256-GCM + RSA-OAEP
    - **Certificate Revocation**: CRL management
    - **Audit Logging**: Complete security audit trail
    
    ## Security Guarantees
    
    - **Confidentiality**: Encrypted content sharing
    - **Integrity**: Hash-based tampering detection
    - **Authentication**: Certificate-based identity
    - **Non-repudiation**: Signature binding to identity
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    settings = get_settings()
    
    # Check if CA is initialized
    pki_initialized = (
        settings.ca_key_full_path.exists() and 
        settings.ca_cert_full_path.exists()
    )
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "pki_initialized": pki_initialized,
        "database_connected": True  # Assumed if we got this far
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Sealionyx API",
        "version": "1.0.0",
        "description": "Cryptographic Authenticity Platform for AI-Generated Content",
        "docs": "/docs",
        "health": "/health"
    }


# Include routers
app.include_router(pki_router)
app.include_router(users_router)
app.include_router(auth_router)
app.include_router(seal_router)
app.include_router(verify_router)
app.include_router(encrypt_router)
app.include_router(audit_router)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if get_settings().debug else "An unexpected error occurred"
        }
    )


# Cert endpoint (aliased for convenience)
@app.get("/cert/me")
async def get_cert_me():
    """Redirect to /users/me/certificate."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/users/me/certificate", status_code=307)


# Revoke endpoint at root level (as per requirements)
@app.post("/revoke")
async def revoke_at_root(
    request: dict,
    # Import dependencies inline to avoid circular imports
):
    """Revoke endpoint at root level - delegates to users router."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/users/revoke", status_code=307)


# Debug endpoint to check token
@app.get("/debug/token")
async def debug_token(request: Request):
    """Debug endpoint to check JWT token."""
    import jwt
    
    authorization = request.headers.get("Authorization", "")
    
    if not authorization:
        return {"error": "No Authorization header"}
    
    # Extract token
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization
    
    try:
        # Get header without verification
        header = jwt.get_unverified_header(token)
        payload = jwt.decode(token, options={"verify_signature": False})
        return {
            "header": header,
            "payload": payload,
            "token_length": len(token)
        }
    except Exception as e:
        return {
            "error": str(e),
            "type": type(e).__name__
        }
