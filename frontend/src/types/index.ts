/**
 * Type definitions for Sealionyx frontend
 */

export interface User {
  id: string
  email?: string
  created_at: string
}

export interface CertificateInfo {
  subject: string
  issuer: string
  serial_number: string
  not_valid_before: string
  not_valid_after: string
  fingerprint_sha256?: string
  status: 'active' | 'revoked' | 'expired'
}

export interface UserCryptoStatus {
  provisioned: boolean
  certificate?: CertificateInfo
  public_key_pem?: string
}

export interface SealedBundle {
  version: string
  bundle_id?: string
  content_hash: string
  signature: string
  certificate: string
  metadata: {
    timestamp: string
    signature_algorithm: string
    hash_algorithm: string
    content_type?: string
    model_name?: string
    title?: string
    signer_id?: string
  }
}

export interface EncryptedBundle {
  version: string
  bundle_id?: string
  encryption: {
    algorithm: string
    key_algorithm: string
  }
  encrypted_content: string
  encrypted_key: string
  nonce: string
  metadata: {
    timestamp: string
    sender_id?: string
    recipient_id?: string
  }
  sender?: {
    certificate?: string
    user_id?: string
  }
  contains_signature?: boolean
}

export interface VerificationResult {
  valid: boolean
  message: string
  seal_found?: boolean  // For embedded image seals
  details: {
    certificate_valid?: boolean
    certificate_chain_valid?: boolean
    certificate_not_revoked?: boolean
    signature_valid?: boolean
    hash_valid?: boolean
    seal_found?: boolean  // For embedded image seals
    hash_comparison?: {
      original_hash: string
      computed_hash: string
      match: boolean
    } | null
    signer_info?: {
      subject: string
      common_name?: string
      email?: string
      serial_number: string
      not_valid_before: string
      not_valid_after: string
    }
    errors?: string[]
    metadata?: Record<string, any>
  }
}

export interface AuditLogEntry {
  id: string
  actor_id?: string
  action: string
  result: 'success' | 'failure' | 'error' | 'existing'
  details?: Record<string, any>
  created_at: string
}

export interface Document {
  id: string
  owner_id: string
  hash: string
  signature: string
  bundle_path?: string
  metadata_json?: string
  created_at: string
}

export interface CAInfo {
  subject: string
  issuer: string
  serial_number: string
  not_valid_before: string
  not_valid_after: string
  public_key_algorithm: string
  signature_algorithm: string
}

export interface PKIInfo {
  initialized: boolean
  ca_info?: CAInfo
  crl_info?: {
    revoked_count: number
    revoked_serials: string[]
    last_updated: string
  }
}
