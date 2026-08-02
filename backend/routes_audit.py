"""Audit Log domain — list / meta / export / purge / bulk-delete.

Extracted from server.py (behavior unchanged). Routes register on the shared
`api_router` at import time.
"""
import io
import re
import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from openpyxl import Workbook

from server import api_router, db, log_audit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE


AUDIT_ENTITY_TYPES = ["user", "role", "office", "level", "database", "broadcast", "branding", "audit"]
AUDIT_ACTIONS = [
    "create", "update", "delete", "bulk_delete",
    "import", "reassign", "change_password", "reset_password",
    "backup", "restore", "configure", "test", "send_test",
    "password_reset_requested", "password_reset", "purge", "export",
]


def _audit_query(entity_type, action, q, date_from, date_to) -> dict:
    """Shared filter builder for the audit list / export / purge endpoints."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if action:
        query["action"] = action
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"summary": rx}, {"entity_label": rx}, {"actor": rx}]
    if date_from or date_to:
        rng = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to if len(date_to) > 10 else date_to + "T23:59:59.999999+00:00"
        query["created_at"] = rng
    return query


@api_router.get("/audit-logs", tags=["Audit"], summary="List audit logs (paginated, filterable)")
async def list_audit_logs(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Text search on summary / entity label / actor"),
    date_from: Optional[str] = Query(None, description="ISO date/datetime lower bound (inclusive)"),
    date_to: Optional[str] = Query(None, description="ISO date/datetime upper bound (inclusive)"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_dir: Optional[str] = Query("desc", description="asc | desc"),
):
    """Audit entries sorted server-side across the whole dataset, bounded by
    `limit`; total count in `X-Total-Count`."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if action:
        query["action"] = action
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"summary": rx}, {"entity_label": rx}, {"actor": rx}]
    if date_from or date_to:
        rng = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            # make an all-day upper bound inclusive when only a date is given
            rng["$lte"] = date_to if len(date_to) > 10 else date_to + "T23:59:59.999999+00:00"
        query["created_at"] = rng
    total = await db.audit_logs.count_documents(query)
    response.headers["X-Total-Count"] = str(total)
    _sortable = {"created_at", "actor", "action", "entity_type", "summary"}
    field = sort_by if sort_by in _sortable else "created_at"
    direction = 1 if (sort_dir or "").lower() == "asc" else -1
    cursor = db.audit_logs.find(query, {"_id": 0})
    # Case-insensitive sort for text fields (matches UI expectations); created_at
    # keeps exact lexicographic order (ISO strings == chronological).
    if field != "created_at":
        cursor = cursor.collation({"locale": "en", "strength": 2})
    docs = await cursor.sort(field, direction).skip(skip).limit(limit).to_list(limit)
    # Defensive: coerce any residual BSON types (e.g. legacy nested ObjectId) to
    # JSON-safe values so a single bad legacy row can never 500 the endpoint.
    return json.loads(json.dumps(docs, default=str))


@api_router.get("/audit-logs/meta", tags=["Audit"], summary="Audit filter options")
async def audit_meta():
    """Static filter options for the Audit Log UI."""
    return {"entity_types": AUDIT_ENTITY_TYPES, "actions": AUDIT_ACTIONS}


# Hard cap for a single export so we never stream an unbounded result set.
AUDIT_EXPORT_CAP = 50000


@api_router.get("/audit-logs/export", tags=["Audit"], summary="Export filtered audit logs (CSV/Excel)")
async def export_audit_logs(
    format: str = Query("csv", description="csv | xlsx"),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    """Stream the matching audit entries as a CSV or Excel file (same filters as the list)."""
    query = _audit_query(entity_type, action, q, date_from, date_to)
    docs = (
        await db.audit_logs.find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(AUDIT_EXPORT_CAP)
        .to_list(AUDIT_EXPORT_CAP)
    )
    cols = ["created_at", "actor", "action", "entity_type", "entity_label", "summary", "method", "path", "status_code"]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    if format == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.title = "Audit Log"
        ws.append([c.replace("_", " ").title() for c in cols])
        for d in docs:
            ws.append([d.get(c) for c in cols])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="audit_log_{stamp}.xlsx"'},
        )
    import csv
    sbuf = io.StringIO()
    writer = csv.writer(sbuf)
    writer.writerow([c.replace("_", " ").title() for c in cols])
    for d in docs:
        writer.writerow([d.get(c) if d.get(c) is not None else "" for c in cols])
    data = sbuf.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="audit_log_{stamp}.csv"'},
    )


class AuditPurgeRequest(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None


@api_router.post("/audit-logs/purge", tags=["Audit"], summary="Delete audit logs in a date range (retention)")
async def purge_audit_logs(payload: AuditPurgeRequest):
    """Delete audit entries within a date range. At least one bound is required.

    The purge itself is recorded as a new audit entry for traceability.
    """
    if not payload.date_from and not payload.date_to:
        raise HTTPException(status_code=400, detail="Provide date_from and/or date_to to purge.")
    query = _audit_query(None, None, None, payload.date_from, payload.date_to)
    result = await db.audit_logs.delete_many(query)
    await log_audit(
        "purge", "audit",
        summary=f"Purged {result.deleted_count} audit log entry(ies) in range "
                f"{payload.date_from or '…'} → {payload.date_to or '…'}",
        method="POST", path="/api/audit-logs/purge", status_code=200,
        request={"date_from": payload.date_from, "date_to": payload.date_to},
        response={"deleted": result.deleted_count},
        metadata={"deleted": result.deleted_count},
    )
    return {"success": True, "deleted": result.deleted_count}


class AuditBulkDeleteRequest(BaseModel):
    ids: List[str] = Field(default_factory=list)


@api_router.post("/audit-logs/bulk-delete", tags=["Audit"], summary="Delete selected audit log entries")
async def bulk_delete_audit_logs(payload: AuditBulkDeleteRequest):
    """Delete the given audit entries by id. Records a single bulk_delete entry."""
    ids = [i for i in (payload.ids or []) if i]
    if not ids:
        raise HTTPException(status_code=400, detail="Provide at least one id to delete.")
    result = await db.audit_logs.delete_many({"id": {"$in": ids}})
    await log_audit(
        "bulk_delete", "audit",
        summary=f"Deleted {result.deleted_count} selected audit log entry(ies)",
        method="POST", path="/api/audit-logs/bulk-delete", status_code=200,
        request={"count": len(ids)}, response={"deleted": result.deleted_count},
        metadata={"deleted": result.deleted_count},
    )
    return {"success": True, "deleted": result.deleted_count}
