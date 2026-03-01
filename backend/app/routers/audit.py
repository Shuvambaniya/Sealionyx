"""
Audit log endpoints.

Provides access to security audit logs.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..dependencies import (
    get_current_user,
    get_supabase_service,
    CurrentUser
)
from ..services.supabase import SupabaseService
from ..models.schemas import AuditLogResponse, AuditLogEntry


router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=AuditLogResponse)
async def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: CurrentUser = Depends(get_current_user),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Get audit logs.
    
    Regular users see their own logs.
    In production, admins would see all logs.
    """
    offset = (page - 1) * page_size
    
    logs = await supabase.get_audit_logs(
        actor_id=current_user.user_id,
        action=action,
        limit=page_size,
        offset=offset
    )
    
    total = await supabase.get_audit_logs_count(
        actor_id=current_user.user_id,
        action=action
    )
    
    # Convert to response format
    log_entries = []
    for log in logs:
        import json
        details = log.get("details_json")
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except:
                details = {}
        
        log_entries.append(AuditLogEntry(
            id=str(log.get("id", "")),
            actor_id=log.get("actor_id"),
            action=log.get("action", ""),
            result=log.get("result", ""),
            details=details,
            created_at=log.get("created_at", "")
        ))
    
    return AuditLogResponse(
        logs=log_entries,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/actions")
async def get_audit_action_types():
    """
    Get list of possible audit action types.
    """
    return {
        "actions": [
            "pki_setup",
            "user_provision",
            "auth_verify",
            "seal",
            "verify",
            "encrypt",
            "decrypt",
            "revoke"
        ]
    }


@router.get("/stats")
async def get_audit_stats(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: SupabaseService = Depends(get_supabase_service)
):
    """
    Get audit statistics for the current user.
    """
    # Get counts by action type
    actions = ["seal", "verify", "encrypt", "decrypt", "revoke"]
    stats = {}
    
    for action in actions:
        count = await supabase.get_audit_logs_count(
            actor_id=current_user.user_id,
            action=action
        )
        stats[action] = count
    
    total = await supabase.get_audit_logs_count(
        actor_id=current_user.user_id
    )
    
    return {
        "total_actions": total,
        "by_action": stats
    }
