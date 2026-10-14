from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


class Base(DeclarativeBase):
    pass


# SQLite 便于本地开发；生产环境通过 DATABASE_URL 切换 PostgreSQL。
DATABASE_URL = __import__("os").environ.get(
    "DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'words_sys.db'}"
)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
