from __future__ import annotations

import argparse
import getpass
import sys

from pwdlib import PasswordHash
from sqlalchemy import select

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.models import User, UserRole  # noqa: E402


parser = argparse.ArgumentParser(description='Create or update a words_sys administrator')
parser.add_argument('--name', required=True)
parser.add_argument('--email')
args = parser.parse_args()
password = getpass.getpass('Admin password (min 8 chars): ')
if len(password) < 8:
    raise SystemExit('Password must contain at least 8 characters')

Base.metadata.create_all(bind=engine)
hasher = PasswordHash.recommended()
with SessionLocal() as db:
    user = db.scalar(select(User).where(User.name == args.name))
    if user is None:
        user = User(name=args.name, email=args.email, password_hash=hasher.hash(password), role=UserRole.ADMIN)
        db.add(user)
    else:
        user.email = args.email or user.email
        user.password_hash = hasher.hash(password)
        user.role = UserRole.ADMIN
        user.is_active = True
    db.commit()
    print(f'Admin ready: id={user.id}, name={user.name}')
