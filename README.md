# Sealionyx - Cryptographic Authenticity Platform for AI-Generated Content

A comprehensive web platform providing cryptographic authenticity for AI-generated content using Public Key Infrastructure (PKI), X.509 certificates, digital signatures, and hybrid encryption. Sealionyx ensures that AI-generated content can be cryptographically verified, sealed, and securely shared while maintaining confidentiality, integrity, authentication, and non-repudiation.

## 🎯 Overview

Sealionyx addresses the critical challenge of verifying the authenticity and integrity of AI-generated content. In an era where AI-generated media is increasingly prevalent, Sealionyx provides a robust cryptographic framework that allows users to:

- **Seal** AI-generated content with cryptographic signatures
- **Verify** the authenticity and integrity of sealed content
- **Encrypt** and securely share content with specific recipients
- **Track** all cryptographic operations through comprehensive audit logs

## 🔒 Security Guarantees

Sealionyx provides four fundamental security guarantees:

- **Confidentiality**: Hybrid encryption (AES-256-GCM + RSA-OAEP) ensures that only intended recipients can access encrypted content
- **Integrity**: SHA-256 hashing with RSA-PSS signatures detects any tampering or modification of sealed content
- **Authentication**: X.509 certificate-based identity verification ensures users are who they claim to be
- **Non-repudiation**: Digital signatures bound to user certificates provide cryptographic proof of authorship, logged in a complete audit trail

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Sealionyx Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────────────┐ │
│  │   Frontend   │◄───────►│   Backend    │◄───────►│      Supabase        │ │
│  │   Next.js    │  REST   │   FastAPI    │   SDK   │  (Postgres+Storage)  │ │
│  │  TypeScript  │   API   │   Python     │         │                      │ │
│  └──────────────┘         └──────────────┘         └──────────────────────┘ │
│        │                         │                          │               │
│        │                         │                          │               │
│        ▼                         ▼                          ▼               │
│  ┌──────────┐           ┌────────────────┐         ┌─────────────────────┐  │
│  │ Supabase │           │ Crypto Engine  │         │ Data Storage        │  │
│  │   Auth   │           │ • PKI/X.509    │         │ • users_crypto      │  │
│  │   JWT    │           │ • RSA-2048     │         │ • documents         │  │
│  └──────────┘           │ • AES-256-GCM  │         │ • audit_logs        │  │
│                         │ • SHA-256      │         │ • Storage Buckets   │  │
│                         │ • CRL          │         └─────────────────────┘  │
│                         └────────────────┘                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Trust Model

**IMPORTANT**: Supabase handles login identity and data storage. **All cryptographic trust decisions are performed in FastAPI**:
- Certificate validation against CA
- CRL (Certificate Revocation List) checks
- Signature verification
- Encryption/decryption operations

Supabase is **NOT** the source of cryptographic trust.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (TypeScript), Tailwind CSS |
| Backend | Python FastAPI |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Auth | Supabase Auth (JWT) |
| Crypto | Python `cryptography` library |

## ✨ Features

### 1. User Authentication with Digital Certificates
- **User Registration**: Secure registration via Supabase Auth with email verification
- **RSA-2048 Keypair Generation**: Each user receives a unique RSA-2048 keypair generated server-side
- **X.509 Certificate Issuance**: Certificates signed by the local Certificate Authority (CA) with user identity information
- **Challenge-Response Authentication**: Cryptographic challenge-response mechanism for secure authentication
- **Certificate Management**: View, download, and manage your digital certificate through the web interface

### 2. Content Sealing (Digital Signing)
- **SHA-256 Content Hashing**: Computes cryptographic hash of content to ensure integrity
- **RSA-PSS Digital Signatures**: Creates tamper-proof signatures using RSA-PSS algorithm
- **Bundle Generation**: Creates `bundle.json` files containing hash, signature, certificate, and metadata
- **Embedded Seals for Images**: For images (JPEG, PNG, WEBP), seals are embedded directly into file metadata (EXIF/XMP) rather than separate bundles
- **Metadata Preservation**: Stores AI model information, timestamps, and content type with each seal
- **Public Verification**: Anyone can verify sealed content without authentication

### 3. Content Verification
- **Cryptographic Verification**: Verifies signatures, certificate chains, and content hashes
- **Certificate Revocation Checking**: Validates certificates against Certificate Revocation List (CRL)
- **Tampering Detection**: Detects any modifications to sealed content by comparing hashes
- **Public Access**: Verification works for both authenticated and unauthenticated users
- **Detailed Results**: Provides comprehensive verification results including signer information, timestamps, and integrity status
- **Image Verification**: Supports verification of images with embedded seals

### 4. Hybrid Encryption & Secure Sharing
- **AES-256-GCM Encryption**: Symmetric encryption for content using AES-256 in GCM mode
- **RSA-OAEP Key Encapsulation**: Asymmetric encryption for AES keys using RSA-OAEP
- **Recipient-Based Access**: Content encrypted specifically for recipient's public key
- **Optional Signing**: Can combine encryption with digital signatures for authenticated encryption
- **Secure Decryption**: Only intended recipients can decrypt content using their private keys
- **Bundle Format**: Encrypted content packaged in structured JSON bundles with metadata

### 5. Key Management
- **Certificate Authority (CA)**: Server-side CA with restricted file permissions (0600)
- **Encrypted Key Storage**: User private keys encrypted at rest using Fernet (AES-128-CBC + HMAC)
- **Certificate Revocation List (CRL)**: Centralized revocation management for compromised certificates
- **Key Rotation Support**: Infrastructure for certificate renewal and key rotation
- **Secure Key Generation**: All cryptographic keys generated using secure random number generators

### 6. Audit Logging & Compliance
- **Complete Audit Trail**: Every cryptographic operation logged with timestamps, user IDs, and results
- **Action Tracking**: Logs include sealing, verification, encryption, decryption, and certificate operations
- **Security Monitoring**: Track all security events for compliance and forensic analysis
- **Filterable Logs**: Search and filter audit logs by action type, user, date range
- **Statistics Dashboard**: View aggregated statistics of cryptographic operations

### 7. User Interface & Experience
- **Modern Web Interface**: Built with Next.js 14 and Tailwind CSS for responsive, professional UI
- **Dark Theme**: Optimized dark theme with smooth animations
- **Real-time Feedback**: Immediate visual feedback for all operations
- **File Upload Support**: Drag-and-drop file uploads for images and videos
- **Bundle Management**: Easy download and sharing of sealed and encrypted bundles
- **Error Handling**: Comprehensive error messages with actionable guidance

## 🔄 How Sealionyx Works

### Workflow Overview

Sealionyx follows a comprehensive workflow to ensure cryptographic authenticity:

#### 1. **Initial Setup & PKI Initialization**
```
Admin → Initialize CA → Generate CA keypair → Create root certificate
```
- The Certificate Authority (CA) is initialized once by an administrator
- CA generates its own RSA-2048 keypair and self-signed root certificate
- CA private key is stored securely on the server with restricted permissions

#### 2. **User Onboarding**
```
User Registration → Certificate Provisioning → Keypair Generation → Certificate Issuance
```
- User registers via Supabase Auth (email/password)
- User requests certificate provisioning
- Server generates RSA-2048 keypair for the user
- Server creates X.509 certificate signed by CA
- User's private key is encrypted with Fernet and stored in database
- Certificate is stored in database and made available to user

#### 3. **Content Sealing Process**
```
Content Input → Hash Computation → Signature Creation → Bundle Generation → Storage
```

**For Text/Video Content:**
1. User provides content (text or video file)
2. System computes SHA-256 hash of content
3. User's private key signs the hash using RSA-PSS
4. Creates `bundle.json` containing:
   - Content hash
   - Digital signature
   - User's certificate
   - CA certificate (certificate chain)
   - Metadata (timestamp, AI model, title, content type)
5. Bundle stored in Supabase Storage
6. Operation logged in audit trail

**For Image Content:**
1. User uploads image file (JPEG, PNG, WEBP)
2. System computes SHA-256 hash of image pixel data (excluding metadata)
3. User's private key signs the hash
4. Seal data embedded directly into image metadata:
   - JPEG: EXIF UserComment field
   - PNG: Text chunk
   - WEBP: XMP metadata
5. Sealed image returned to user (original file with embedded seal)
6. Operation logged in audit trail

#### 4. **Content Verification Process**
```
Bundle/Image Upload → Extract Seal → Verify Certificate → Verify Signature → Compare Hash → Result
```

**For Bundle Verification:**
1. User uploads `bundle.json` file
2. System extracts hash, signature, and certificate from bundle
3. Verifies certificate chain (user cert → CA cert)
4. Checks certificate against CRL (not revoked)
5. Verifies signature using user's public key
6. If original content provided, computes hash and compares
7. Returns detailed verification result

**For Image Verification:**
1. User uploads sealed image
2. System extracts seal data from image metadata
3. Computes current hash of image pixel data
4. Verifies signature and certificate chain
5. Compares current hash with original hash from seal
6. Returns verification result with tampering detection

#### 5. **Encryption & Sharing Process**
```
Content + Recipient → Generate AES Key → Encrypt Content → Encrypt Key → Create Bundle → Share
```

1. User provides content and recipient email/user ID
2. System retrieves recipient's public key from database
3. Generates random AES-256 key
4. Encrypts content with AES-256-GCM (symmetric)
5. Encrypts AES key with recipient's RSA public key (RSA-OAEP)
6. Optionally signs content before encryption
7. Creates encrypted bundle with:
   - Encrypted content
   - Encrypted AES key
   - Nonce/IV for GCM
   - Metadata (sender, recipient, timestamp)
   - Optional signature information
8. Bundle stored and shared with recipient

#### 6. **Decryption Process**
```
Encrypted Bundle → Decrypt AES Key → Decrypt Content → Verify Signature (if present) → Display
```

1. Recipient uploads encrypted bundle
2. System uses recipient's private key to decrypt AES key (RSA-OAEP)
3. Uses decrypted AES key to decrypt content (AES-256-GCM)
4. If content was signed, automatically verifies signature
5. Returns decrypted content with verification details
6. Operation logged in audit trail

### Cryptographic Algorithms

| Operation | Algorithm | Purpose |
|-----------|-----------|---------|
| **Hashing** | SHA-256 | Content integrity verification |
| **Digital Signatures** | RSA-PSS with SHA-256 | Content authentication and non-repudiation |
| **Symmetric Encryption** | AES-256-GCM | Fast, secure content encryption |
| **Asymmetric Encryption** | RSA-OAEP (2048-bit) | Key encapsulation and secure key exchange |
| **Key Storage** | Fernet (AES-128-CBC + HMAC) | Encrypted storage of user private keys |
| **Certificate Format** | X.509 v3 | Standard certificate format for PKI |

### Security Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Sealionyx Security Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Registration                                               │
│       │                                                          │
│       ▼                                                          │
│  Certificate Provisioning                                        │
│       │                                                          │
│       ├─► Generate RSA-2048 Keypair                             │
│       ├─► Create X.509 Certificate                              │
│       ├─► Encrypt Private Key (Fernet)                          │
│       └─► Store in Database                                      │
│                                                                  │
│  Content Sealing                                                 │
│       │                                                          │
│       ├─► Compute SHA-256 Hash                                  │
│       ├─► Sign Hash (RSA-PSS)                                    │
│       ├─► Create Bundle/Embed in Image                          │
│       └─► Store & Log                                           │
│                                                                  │
│  Content Verification                                            │
│       │                                                          │
│       ├─► Extract Seal Data                                     │
│       ├─► Verify Certificate Chain                             │
│       ├─► Check CRL                                             │
│       ├─► Verify Signature                                      │
│       ├─► Compare Hashes                                        │
│       └─► Return Result                                         │
│                                                                  │
│  Encryption & Sharing                                            │
│       │                                                          │
│       ├─► Generate AES-256 Key                                  │
│       ├─► Encrypt Content (AES-256-GCM)                         │
│       ├─► Encrypt Key (RSA-OAEP)                                │
│       ├─► Optionally Sign                                        │
│       └─► Create Encrypted Bundle                                │
│                                                                  │
│  Decryption                                                      │
│       │                                                          │
│       ├─► Decrypt AES Key (RSA-OAEP)                            │
│       ├─► Decrypt Content (AES-256-GCM)                         │
│       ├─► Verify Signature (if present)                         │
│       └─► Return Decrypted Content                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase account (free tier works)

### 1. Clone and Setup

```bash
cd sealionyx

# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

### 2. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Run the SQL migrations in `supabase/migrations/` in the SQL Editor
3. Create storage buckets: `sealed-bundles`, `encrypted-bundles`, `uploads`
4. Copy your project URL and keys to `.env` files

### 3. Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize CA (first time only)
python -c "from app.crypto.ca import CertificateAuthority; CertificateAuthority()"

# Start server
uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🐳 Docker

Run Sealionyx with Docker Compose (frontend + backend). Supabase remains external.

### Prerequisites
- Docker and Docker Compose
- Supabase project (URL, anon key, service role key)

### 1. Configure environment

```bash
cp .env.docker.example .env
# Edit .env and set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
# CRYPTO_SECRET, and JWT_SECRET (see backend/.env.example for how to get these).
```

### 2. Build and run

```bash
docker compose up --build
```

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:8000  
- **API Docs:** http://localhost:8000/docs  

### 3. Optional: run in background

```bash
docker compose up --build -d
```

### 4. Persistence

- CA key and certificate are stored in a Docker volume `sealionyx_ca` so they persist across container restarts.
- To reset PKI (new CA), remove the volume: `docker compose down -v` then `docker compose up --build`.

### 5. Build images only (no compose)

```bash
# Backend
docker build -t sealionyx-backend:latest ./backend

# Frontend
docker build -t sealionyx-frontend:latest ./frontend
```

Run backend (with env file and CA volume):

```bash
docker run -d --name sealionyx-backend -p 8000:8000 --env-file backend/.env -v sealionyx_ca:/app/ca sealionyx-backend:latest
```

Run frontend (pass env vars so the browser can reach the backend at localhost:8000):

```bash
docker run -d --name sealionyx-frontend -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000 \
  sealionyx-frontend:latest
```

## 📡 API Endpoints

### PKI Management
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/pki/setup` | POST | Initialize Certificate Authority (admin only) | No |
| `/pki/info` | GET | Get PKI status and CA information | No |
| `/pki/ca-certificate` | GET | Download CA root certificate | No |

### User Management
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/users/provision` | POST | Generate RSA keypair & X.509 certificate for user | Yes |
| `/users/me/status` | GET | Get user's cryptographic status (provisioned, certificate info) | Yes |
| `/users/me/certificate` | GET | Get user's certificate and public key | Yes |
| `/users/revoke` | POST | Revoke user certificate (add to CRL) | Yes |

### Authentication
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/challenge` | POST | Get cryptographic challenge for authentication | Yes |
| `/auth/verify` | POST | Verify challenge-response signature | Yes |

### Content Sealing
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/seal` | POST | Sign content → create `bundle.json` (for text/video) | Yes |
| `/seal/embedded` | POST | Embed seal in image metadata (for images) | Yes |
| `/seal/my-bundles` | GET | Get list of user's sealed bundles | Yes |

### Content Verification
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/verify` | POST | Verify `bundle.json` (public access) | No |
| `/verify/quick` | POST | Quick verification without full certificate chain check | No |
| `/verify/embedded` | POST | Verify image with embedded seal (public access) | No |

### Encryption & Decryption
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/encrypt` | POST | Encrypt content for recipient (hybrid encryption) | Yes |
| `/encrypt/decrypt` | POST | Decrypt encrypted bundle | Yes |

### Audit & Logging
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/audit` | GET | Get audit logs with filtering (action, page, page_size) | Yes |
| `/audit/stats` | GET | Get audit statistics by action type | Yes |

### Health & Status
| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/health` | GET | Health check and system status | No |
| `/` | GET | API information and documentation links | No |

## 🧪 Testing Guide

### Automated Test Suite

```bash
# Run the complete test suite
cd backend
python tests/demo_script.py
```

The test suite covers:
- PKI initialization and CA certificate generation
- User certificate provisioning
- Content sealing and verification
- Tampering detection
- Certificate revocation
- Hybrid encryption and decryption
- Multi-user scenarios

### Manual Test Cases

#### 1. User Registration & Certificate Provisioning
1. Register a new user via the web interface (`/auth`)
2. Navigate to Dashboard (`/dashboard`)
3. Click "Get Certificate" to provision your certificate
4. Verify certificate appears in "My Certificate" page (`/certificate`)
5. Download and inspect the certificate

#### 2. Content Sealing (Text/Video)
1. Navigate to "Seal AI Media" (`/seal`)
2. Upload a video file or provide text content
3. Fill in metadata (AI model, title)
4. Click "Seal Content"
5. Download the generated `bundle.json`
6. Verify the bundle contains hash, signature, and certificate

#### 3. Content Sealing (Images with Embedded Seals)
1. Navigate to "Seal AI Media" (`/seal`)
2. Upload an image file (JPEG, PNG, or WEBP)
3. Fill in metadata
4. Click "Seal Content"
5. Download the sealed image
6. Verify the seal is embedded in image metadata (can be verified later)

#### 4. Content Verification (Bundle)
1. Navigate to "Verify Content" (`/verify`) - public page, no login required
2. Upload the `bundle.json` file
3. Optionally provide original content for hash comparison
4. Click "Verify Bundle"
5. Verify results show:
   - Signature validity
   - Certificate chain validity
   - Hash match (if content provided)
   - Signer information
   - Timestamp

#### 5. Content Verification (Image with Embedded Seal)
1. Navigate to "Verify Content" (`/verify`)
2. Upload the sealed image file
3. Click "Verify Image"
4. Verify results show embedded seal information and integrity status

#### 6. Tampering Detection
1. Seal some content and download the bundle
2. Manually edit the `bundle.json` (change hash or signature)
3. Attempt to verify the tampered bundle
4. Verification should fail with "Content modified after sealing" message
5. Original hash and computed hash should be displayed for comparison

#### 7. Certificate Revocation
1. As an admin, revoke a user's certificate
2. Attempt to verify content sealed by that user
3. Verification should fail with "Certificate revoked" error
4. New sealing operations should fail for revoked user

#### 8. Hybrid Encryption & Sharing
1. Navigate to "Encrypt & Share" (`/encrypt`)
2. Enter content and recipient email
3. Optionally enable signing before encryption
4. Click "Encrypt"
5. Download or copy the encrypted bundle
6. Share with recipient

#### 9. Decryption
1. As recipient, navigate to "Encrypt & Share" (`/encrypt`)
2. Switch to "Decrypt" mode
3. Upload or paste the encrypted bundle
4. Click "Decrypt"
5. Verify decrypted content is displayed
6. If content was signed, verify signature verification is shown

#### 10. Multi-User Scenario
1. Register two users: Alice and Bob
2. Alice seals content and shares bundle with Bob
3. Bob verifies Alice's sealed content (should succeed)
4. Alice encrypts content for Bob
5. Bob decrypts and verifies content (should succeed)
6. Bob attempts to decrypt content intended for another user (should fail)

### Security Tests

- **MITM Simulation**: Tampered bundles fail integrity checks with detailed hash comparison
- **Certificate Spoofing**: Untrusted certificates rejected during chain verification
- **Replay Attack**: Challenge-response with nonce prevents replay attacks
- **Key Compromise**: Revoked certificates immediately invalidate all signatures
- **Tampering Detection**: Any modification to sealed content detected via hash mismatch
- **Access Control**: Only intended recipients can decrypt encrypted content

### Performance Tests

- Seal operation: < 1 second for typical content
- Verification: < 500ms for bundle verification
- Encryption: < 2 seconds for typical content
- Decryption: < 1 second for typical content

## Project Structure

```
sealionyx/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Configuration
│   │   ├── dependencies.py      # Auth dependencies
│   │   ├── crypto/
│   │   │   ├── __init__.py
│   │   │   ├── ca.py            # Certificate Authority
│   │   │   ├── certificates.py  # Certificate operations
│   │   │   ├── keys.py          # Key management
│   │   │   ├── signing.py       # Digital signatures
│   │   │   ├── encryption.py    # Hybrid encryption
│   │   │   └── crl.py           # Revocation list
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── pki.py           # PKI endpoints
│   │   │   ├── users.py         # User provisioning
│   │   │   ├── auth.py          # Challenge-response
│   │   │   ├── seal.py          # Signing endpoints
│   │   │   ├── verify.py        # Verification
│   │   │   ├── encrypt.py       # Encryption/decryption
│   │   │   └── audit.py         # Audit logs
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic models
│   │   └── services/
│   │       └── supabase.py      # Supabase client
│   ├── ca/                      # CA keys (gitignored)
│   ├── tests/
│   │   ├── test_crypto.py
│   │   ├── test_api.py
│   │   └── demo_script.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── types/
│   ├── package.json
│   └── tailwind.config.js
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── docker-compose.yml
└── README.md
```

## Security Considerations

### Key Storage Strategy

1. **CA Private Key**: Stored in `backend/ca/` with 0600 permissions, never leaves server
2. **User Private Keys**: Encrypted at rest using Fernet (AES-128-CBC + HMAC)
   - Encryption key derived from `CRYPTO_SECRET` environment variable
   - Stored encrypted in Supabase database
3. **Certificates**: Stored in PEM format in database and optionally in Supabase Storage

### Why Fernet for User Keys?

Fernet provides:
- AES-128-CBC encryption
- HMAC-SHA256 for integrity
- Timestamp for rotation detection
- Simple, secure, authenticated encryption

Alternative: AES-256-GCM with key derived via PBKDF2 from server secret.

## Coursework Rubric Compliance

| Requirement | Implementation |
|-------------|----------------|
| PKI/X.509 | Full CA implementation, certificate issuance |
| Digital Signatures | RSA-PSS with SHA-256 |
| Hybrid Encryption | AES-256-GCM + RSA-OAEP |
| Authentication | Certificate-based challenge-response |
| Key Management | Encrypted storage, CRL, audit logging |
| Testing | Comprehensive test suite with demo script |

## 📋 Use Cases

### 1. AI Content Authenticity
**Scenario**: A journalist uses AI to generate an article and wants to prove it was generated at a specific time by a specific AI model.

**Solution**: 
- Journalist seals the article with Sealionyx
- Seal includes timestamp, AI model, and cryptographic signature
- Anyone can verify the article's authenticity and integrity
- Tampering is immediately detectable

### 2. Secure Content Sharing
**Scenario**: A researcher wants to share sensitive AI-generated research data with a colleague.

**Solution**:
- Researcher encrypts content for colleague's email
- Only the colleague can decrypt using their private key
- Optional signing ensures content authenticity
- Complete audit trail of sharing operation

### 3. Media Verification
**Scenario**: A photographer uses AI to enhance images and wants to prove authenticity.

**Solution**:
- Photographer seals images with embedded seals
- Seals are part of image metadata (EXIF/XMP)
- Images can be verified without separate bundle files
- Original image integrity is cryptographically guaranteed

### 4. Compliance & Audit
**Scenario**: An organization needs to track all AI-generated content for compliance.

**Solution**:
- All sealing and encryption operations logged
- Complete audit trail with timestamps and user IDs
- Certificate revocation tracking
- Searchable and filterable audit logs

### 5. Content Integrity Verification
**Scenario**: A user receives AI-generated content and wants to verify it hasn't been modified.

**Solution**:
- User uploads bundle or sealed image
- System verifies signature, certificate, and hash
- Detailed results show signer, timestamp, and integrity status
- Public verification (no login required)

## 🔐 Security Best Practices

### For Administrators
- Keep CA private key secure (0600 permissions, never share)
- Regularly review audit logs for suspicious activity
- Monitor certificate revocation list
- Use strong `CRYPTO_SECRET` environment variable
- Regularly rotate CA certificate (long validity period)

### For Users
- Never share your private key (handled automatically by system)
- Verify content before trusting it
- Check certificate validity dates
- Report suspicious activity
- Use strong passwords for account security

### For Developers
- All cryptographic operations performed server-side
- Private keys never exposed to frontend
- Use HTTPS in production
- Validate all inputs server-side
- Implement rate limiting for API endpoints

## 🛠️ Troubleshooting

### Common Issues

**Issue**: "PKI Status: Not Operational"
- **Solution**: Initialize CA by calling `/pki/setup` endpoint or running initialization script

**Issue**: "Certificate not provisioned"
- **Solution**: Navigate to Dashboard and click "Get Certificate" to provision your certificate

**Issue**: "Invalid token: The specified alg value is not allowed"
- **Solution**: Check JWT_SECRET and JWT_ALGORITHM in backend `.env` file

**Issue**: "Blank white pages"
- **Solution**: Check browser console for errors, verify frontend dev server is running, check API connectivity

**Issue**: "Decryption failed"
- **Solution**: Verify you are the intended recipient, check encrypted bundle format, ensure certificate is valid

**Issue**: "Verification failed"
- **Solution**: Check if certificate is revoked, verify bundle hasn't been tampered with, ensure certificate chain is valid

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Python Cryptography Library](https://cryptography.io/)
- [X.509 Certificate Standard](https://en.wikipedia.org/wiki/X.509)

## 🤝 Contributing

This is a coursework project for ST6051CEM Practical Cryptography. For questions or issues, please refer to the course materials or contact the course instructor.

## 📄 License

MIT License - For educational purposes (ST6051CEM Coursework)

## 👥 Credits

Developed as part of ST6051CEM Practical Cryptography coursework, demonstrating practical implementation of:
- Public Key Infrastructure (PKI)
- X.509 Digital Certificates
- Digital Signatures (RSA-PSS)
- Hybrid Encryption (AES-256-GCM + RSA-OAEP)
- Certificate Revocation Lists (CRL)
- Cryptographic Audit Logging
