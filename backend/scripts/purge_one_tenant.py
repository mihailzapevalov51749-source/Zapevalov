import os
import sys

os.environ.setdefault("YASNOPRO_ALLOW_TENANT_HARD_DELETE", "1")

from app.db.session import SessionLocal
from app.modules.portals.models import Portal
from app.modules.tenant_management.delete_tenant import purge_tenant_hard

tenant_id = int(sys.argv[1])
db = SessionLocal()
try:
    result = purge_tenant_hard(db, tenant_id, confirm=True)
    print(f"OK {result.tenant_id} {result.tenant_name!r}")
except Exception as exc:
    print(f"FAIL {tenant_id}: {exc}")
    db.rollback()
    raise
finally:
    remaining = db.query(Portal).order_by(Portal.id).all()
    print("REMAINING", [(p.id, p.name, p.tenant_status) for p in remaining])
    db.close()
