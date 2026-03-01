"""
Supabase service for database and storage operations.

This service handles:
- User crypto data (keys, certificates)
- Document storage
- Audit logging
- File storage (bundles)

IMPORTANT: Supabase is used for storage only, not for cryptographic trust.
All cryptographic validation is performed in the FastAPI backend.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from functools import lru_cache

from supabase import create_client, Client


class SupabaseService:
    """
    Service for interacting with Supabase.
    
    Provides methods for:
    - User crypto data management
    - Document storage
    - Audit logging
    - File storage
    """
    
    def __init__(self, url: str, service_role_key: str):
        """
        Initialize Supabase client with service role key.
        
        Args:
            url: Supabase project URL
            service_role_key: Service role key for admin access
        """
        self.client: Client = create_client(url, service_role_key)
    
    # =========================================================================
    # User Crypto Operations
    # =========================================================================
    
    async def get_user_crypto(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's cryptographic data.
        
        Args:
            user_id: Supabase user ID
        
        Returns:
            User crypto data or None
        """
        result = self.client.table("users_crypto").select("*").eq(
            "supabase_user_id", user_id
        ).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    
    async def create_user_crypto(
        self,
        user_id: str,
        public_key: str,
        private_key_encrypted: str,
        cert_pem: str,
        cert_serial: str,
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create user crypto record.
        
        Args:
            user_id: Supabase user ID
            public_key: PEM-encoded public key
            private_key_encrypted: Encrypted private key
            cert_pem: PEM-encoded certificate
            cert_serial: Certificate serial number
            email: User's email
        
        Returns:
            Created record
        """
        data = {
            "supabase_user_id": user_id,
            "public_key": public_key,
            "private_key_encrypted": private_key_encrypted,
            "cert_pem": cert_pem,
            "cert_serial": cert_serial,
            "email": email,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = self.client.table("users_crypto").insert(data).execute()
        return result.data[0] if result.data else {}

    async def replace_user_crypto(
        self,
        user_id: str,
        public_key: str,
        private_key_encrypted: str,
        cert_pem: str,
        cert_serial: str,
        email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Replace user crypto (for re-provisioning after revoke).
        Updates the existing row so the user gets a new key and certificate.
        """
        data = {
            "public_key": public_key,
            "private_key_encrypted": private_key_encrypted,
            "cert_pem": cert_pem,
            "cert_serial": cert_serial,
            "email": email,
            "status": "active",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        result = self.client.table("users_crypto").update(data).eq(
            "supabase_user_id", user_id
        ).execute()
        return result.data[0] if result.data else {}
    
    async def update_user_crypto_status(
        self,
        user_id: str,
        status: str
    ) -> bool:
        """
        Update user crypto status (e.g., 'revoked').
        
        Args:
            user_id: Supabase user ID
            status: New status
        
        Returns:
            True if updated
        """
        result = self.client.table("users_crypto").update({
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("supabase_user_id", user_id).execute()
        
        return len(result.data) > 0 if result.data else False
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Get user crypto data by email.
        
        Args:
            email: User's email
        
        Returns:
            User crypto data or None
        """
        result = self.client.table("users_crypto").select("*").eq(
            "email", email
        ).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    
    async def get_user_by_serial(self, serial: str) -> Optional[Dict[str, Any]]:
        """
        Get user crypto data by certificate serial.
        
        Args:
            serial: Certificate serial number
        
        Returns:
            User crypto data or None
        """
        result = self.client.table("users_crypto").select("*").eq(
            "cert_serial", serial.upper()
        ).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    
    # =========================================================================
    # Document Operations
    # =========================================================================
    
    async def create_document(
        self,
        owner_id: str,
        content_hash: str,
        signature: str,
        bundle_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a document record.
        
        Args:
            owner_id: Document owner's user ID
            content_hash: SHA-256 hash of content
            signature: Base64-encoded signature
            bundle_path: Storage path to bundle file
            metadata: Additional metadata
        
        Returns:
            Created document record
        """
        data = {
            "owner_id": owner_id,
            "hash": content_hash,
            "signature": signature,
            "bundle_path": bundle_path,
            "metadata_json": json.dumps(metadata) if metadata else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = self.client.table("documents").insert(data).execute()
        return result.data[0] if result.data else {}
    
    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Get document by ID."""
        result = self.client.table("documents").select("*").eq(
            "id", doc_id
        ).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    
    async def get_user_documents(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get documents owned by a user."""
        result = self.client.table("documents").select("*").eq(
            "owner_id", user_id
        ).order("created_at", desc=True).limit(limit).execute()
        
        return result.data if result.data else []
    
    # =========================================================================
    # Audit Log Operations
    # =========================================================================
    
    async def create_audit_log(
        self,
        actor_id: Optional[str],
        action: str,
        result: str,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create an audit log entry.
        
        Args:
            actor_id: User who performed the action
            action: Action type (e.g., 'seal', 'verify', 'revoke')
            result: Result (e.g., 'success', 'failure')
            details: Additional details
        
        Returns:
            Created audit log entry
        """
        data = {
            "actor_id": actor_id,
            "action": action,
            "result": result,
            "details_json": json.dumps(details) if details else None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            result_data = self.client.table("audit_logs").insert(data).execute()
            return result_data.data[0] if result_data.data else {}
        except Exception as e:
            # Don't fail if audit logging fails
            print(f"Audit log failed: {e}")
            return {}
    
    async def get_audit_logs(
        self,
        actor_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get audit logs with optional filters.
        
        Args:
            actor_id: Filter by actor
            action: Filter by action type
            limit: Max records to return
            offset: Pagination offset
        
        Returns:
            List of audit log entries
        """
        query = self.client.table("audit_logs").select("*")
        
        if actor_id:
            query = query.eq("actor_id", actor_id)
        if action:
            query = query.eq("action", action)
        
        result = query.order("created_at", desc=True).range(
            offset, offset + limit - 1
        ).execute()
        
        return result.data if result.data else []
    
    async def get_audit_logs_count(
        self,
        actor_id: Optional[str] = None,
        action: Optional[str] = None
    ) -> int:
        """Get total count of audit logs matching filters."""
        query = self.client.table("audit_logs").select("id", count="exact")
        
        if actor_id:
            query = query.eq("actor_id", actor_id)
        if action:
            query = query.eq("action", action)
        
        result = query.execute()
        return result.count if result.count else 0
    
    # =========================================================================
    # Storage Operations
    # =========================================================================
    
    async def upload_bundle(
        self,
        bucket: str,
        path: str,
        content: bytes,
        content_type: str = "application/json"
    ) -> Optional[str]:
        """
        Upload a bundle to storage.
        
        Args:
            bucket: Storage bucket name
            path: File path within bucket
            content: File content
            content_type: MIME type
        
        Returns:
            Public URL or None
        """
        try:
            self.client.storage.from_(bucket).upload(
                path,
                content,
                {"content-type": content_type}
            )
            
            # Get public URL
            url = self.client.storage.from_(bucket).get_public_url(path)
            return url
        except Exception as e:
            print(f"Upload failed: {e}")
            return None
    
    async def download_bundle(
        self,
        bucket: str,
        path: str
    ) -> Optional[bytes]:
        """
        Download a bundle from storage.
        
        Args:
            bucket: Storage bucket name
            path: File path within bucket
        
        Returns:
            File content or None
        """
        try:
            response = self.client.storage.from_(bucket).download(path)
            return response
        except Exception as e:
            print(f"Download failed: {e}")
            return None
    
    # =========================================================================
    # Challenge Storage (for auth)
    # =========================================================================
    
    async def store_challenge(
        self,
        challenge_id: str,
        user_id: str,
        nonce: str,
        expires_at: str
    ) -> bool:
        """Store an authentication challenge."""
        data = {
            "id": challenge_id,
            "user_id": user_id,
            "nonce": nonce,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            self.client.table("auth_challenges").insert(data).execute()
            return True
        except Exception as e:
            print(f"Store challenge failed: {e}")
            return False
    
    async def get_challenge(self, challenge_id: str) -> Optional[Dict[str, Any]]:
        """Get a challenge by ID."""
        result = self.client.table("auth_challenges").select("*").eq(
            "id", challenge_id
        ).eq("used", False).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    
    async def mark_challenge_used(self, challenge_id: str) -> bool:
        """Mark a challenge as used."""
        try:
            self.client.table("auth_challenges").update({
                "used": True
            }).eq("id", challenge_id).execute()
            return True
        except Exception:
            return False
