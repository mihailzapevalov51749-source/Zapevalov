from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BASE_DIR = Path(__file__).resolve().parents[3]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(f"DATABASE_URL не найден. Проверь файл .env по пути: {ENV_PATH}")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()