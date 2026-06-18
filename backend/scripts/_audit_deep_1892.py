"""Deep read-only audit: legacy TEMPLATE in portal_constructor_v2 + DEV level classification."""
import os, json
from pathlib import Path
from urllib.parse import urlparse, urlunparse
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
p = urlparse(os.environ["DATABASE_URL"])

def audit_db(dbname: str, portal_id: int):
    url = urlunparse(p._replace(path="/" + dbname))
    with create_engine(url).connect() as c:
        pid = portal_id
        return {
            "portal_id": pid,
            "object_types": [dict(r) for r in c.execute(text(
                "SELECT key,name,is_system,status FROM designer_object_types WHERE tenant_id=:p AND deleted_at IS NULL ORDER BY key"
            ), {"p": pid}).mappings()],
            "pages": [dict(r) for r in c.execute(text(
                "SELECT id,title,status,is_home,is_visible FROM pages WHERE portal_id=:p AND deleted_at IS NULL ORDER BY id"
            ), {"p": pid}).mappings()],
            "workspaces": [dict(r) for r in c.execute(text(
                "SELECT id,title,slug,status FROM designer_workspaces WHERE tenant_id=:p AND deleted_at IS NULL ORDER BY id"
            ), {"p": pid}).mappings()],
            "views": [dict(r) for r in c.execute(text(
                """SELECT v.key,v.name,v.is_system,o.key object_type_key
                FROM designer_view_definitions v JOIN designer_object_types o ON o.id=v.object_type_id
                WHERE v.tenant_id=:p AND v.deleted_at IS NULL ORDER BY o.key,v.key"""
            ), {"p": pid}).mappings()],
            "runtime": [dict(r) for r in c.execute(text(
                """SELECT dot.key,COUNT(re.id) entities FROM designer_object_types dot
                LEFT JOIN runtime_entities re ON re.object_type_id=dot.id AND re.deleted_at IS NULL
                WHERE dot.tenant_id=:p AND dot.deleted_at IS NULL GROUP BY dot.key ORDER BY entities DESC"""
            ), {"p": pid}).mappings()],
            "level2": {
                "runtime_entities": c.execute(text("SELECT COUNT(*) FROM runtime_entities WHERE tenant_id=:p AND deleted_at IS NULL"), {"p": pid}).scalar(),
                "runtime_entity_values": c.execute(text("SELECT COUNT(*) FROM runtime_entity_values")).scalar(),
                "runtime_relation_instances": c.execute(text("SELECT COUNT(*) FROM runtime_relation_instances WHERE tenant_id=:p"), {"p": pid}).scalar(),
                "comments": c.execute(text("SELECT COUNT(*) FROM comments")).scalar(),
                "notes": c.execute(text("SELECT COUNT(*) FROM notes")).scalar(),
                "notifications": c.execute(text("SELECT COUNT(*) FROM notifications")).scalar(),
                "document_libraries": c.execute(text("SELECT COUNT(*) FROM document_libraries")).scalar(),
                "library_documents": c.execute(text("SELECT COUNT(*) FROM library_documents")).scalar(),
                "calendar_events": c.execute(text("SELECT COUNT(*) FROM calendar_events")).scalar(),
                "chat_messages": c.execute(text("SELECT COUNT(*) FROM chat_messages")).scalar(),
            },
            "modules": [dict(r) for r in c.execute(text(
                "SELECT module_key,enabled,installed_version,source FROM tenant_modules WHERE tenant_id=:p"
            ), {"p": pid}).mappings()],
        }

out = {
    "yasnopro_dev_t1": audit_db("yasnopro_dev", 1),
    "legacy_template_t2": audit_db("portal_constructor_v2", 2),
}
print(json.dumps(out, ensure_ascii=False, indent=2, default=str))
