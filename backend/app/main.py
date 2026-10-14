from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from .db import Base, engine, get_db
from .models import (
    ClassMember,
    Classroom,
    ClassWordbook,
    LearningRecord,
    SessionToken,
    User,
    UserRole,
    Word,
    Wordbook,
    WordbookKind,
    utcnow,
)
from .schemas import (
    ClassMemberAdd,
    ClassroomCreate,
    ClassroomOut,
    LearningRecordCreate,
    LearningRecordOut,
    LearningSummary,
    LoginRequest,
    TokenOut,
    UserCreate,
    UserOut,
    UserUpdate,
    WordbookCreate,
    WordbookOut,
    WordbookUpdate,
    WordOut,
)


APP_NAME = "words_sys FastAPI Backend"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "720"))
password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)

app = FastAPI(title=APP_NAME, version="1.0.0", docs_url="/docs", redoc_url="/redoc")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def make_token(user: User, db: Session) -> tuple[str, datetime]:
    expires_at = now_utc() + timedelta(minutes=JWT_EXPIRE_MINUTES)
    token = jwt.encode({"sub": str(user.id), "sid": secrets.token_urlsafe(24), "exp": expires_at}, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    db.add(SessionToken(token_hash=hash_token(token), user_id=user.id, expires_at=expires_at))
    db.commit()
    return token, expires_at


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="需要登录", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="登录令牌无效或已过期", headers={"WWW-Authenticate": "Bearer"})
    session = db.scalar(select(SessionToken).where(SessionToken.token_hash == hash_token(credentials.credentials)))
    if not session or session.revoked_at or as_utc(session.expires_at) <= now_utc():
        raise HTTPException(status_code=401, detail="会话已失效，请重新登录", headers={"WWW-Authenticate": "Bearer"})
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已停用")
    return user


def require_roles(*roles: UserRole):
    def dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="没有执行此操作的权限")
        return user
    return dependency


CurrentUser = Annotated[User, Depends(get_current_user)]
TeacherOrAdmin = Annotated[User, Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN))]
AdminOnly = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


def user_out(user: User) -> UserOut:
    return UserOut.model_validate(user)


def check_class_access(db: Session, classroom_id: int, user: User, *, manage: bool = False) -> Classroom:
    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(status_code=404, detail="班级不存在")
    if user.role == UserRole.ADMIN:
        return classroom
    if user.role != UserRole.TEACHER or classroom.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="只能管理自己创建的班级")
    return classroom


def accessible_wordbook(db: Session, wordbook_id: int, user: User) -> Wordbook:
    book = db.scalar(select(Wordbook).options(selectinload(Wordbook.words), selectinload(Wordbook.class_links)).where(Wordbook.id == wordbook_id, Wordbook.is_active.is_(True)))
    if not book:
        raise HTTPException(status_code=404, detail="词库不存在或已停用")
    if user.role == UserRole.ADMIN or book.kind == WordbookKind.SYSTEM or book.owner_id == user.id:
        return book
    if user.role == UserRole.STUDENT:
        member = db.scalar(select(ClassMember).join(ClassWordbook, ClassWordbook.classroom_id == ClassMember.classroom_id).where(ClassWordbook.wordbook_id == book.id, ClassMember.student_id == user.id))
        if member:
            return book
    raise HTTPException(status_code=403, detail="你没有访问这个词库的权限")


def wordbook_out(book: Wordbook) -> WordbookOut:
    return WordbookOut(
        id=book.id, name=book.name, description=book.description, kind=book.kind, owner_id=book.owner_id,
        source_version=book.source_version, is_active=book.is_active, created_at=book.created_at, updated_at=book.updated_at,
        words=[WordOut.model_validate(word) for word in book.words],
        classroom_ids=[link.classroom_id for link in book.class_links],
    )


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=TokenOut, status_code=201)
def register(payload: UserCreate, db: Annotated[Session, Depends(get_db)]) -> TokenOut:
    if payload.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="公开注册只能创建学生，教师和管理员由管理员创建")
    existing = db.scalar(select(User).where(or_(User.name == payload.name, payload.email is not None and User.email == payload.email)))
    if existing:
        raise HTTPException(status_code=409, detail="名字或邮箱已存在")
    user = User(name=payload.name.strip(), email=str(payload.email) if payload.email else None, school_name=payload.school_name, class_name=payload.class_name, password_hash=password_hash.hash(payload.password), role=UserRole.STUDENT)
    db.add(user); db.commit(); db.refresh(user)
    token, expires_at = make_token(user, db)
    return TokenOut(access_token=token, expires_at=expires_at, user=user_out(user))


@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenOut:
    user = db.scalar(select(User).where(or_(User.name == payload.name_or_email, User.email == payload.name_or_email)))
    if not user or not user.is_active or not password_hash.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码不正确")
    token, expires_at = make_token(user, db)
    return TokenOut(access_token=token, expires_at=expires_at, user=user_out(user))


@app.post("/api/auth/logout", status_code=204, response_model=None)
def logout(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)], db: Annotated[Session, Depends(get_db)], _: CurrentUser) -> None:
    if credentials:
        session = db.scalar(select(SessionToken).where(SessionToken.token_hash == hash_token(credentials.credentials)))
        if session:
            session.revoked_at = now_utc(); db.commit()


@app.get("/api/users/me", response_model=UserOut)
def get_me(user: CurrentUser) -> UserOut:
    return user_out(user)


@app.patch("/api/users/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> UserOut:
    values = payload.model_dump(exclude_unset=True)
    if "password" in values:
        values["password_hash"] = password_hash.hash(values.pop("password"))
    if "email" in values and values["email"]:
        values["email"] = str(values["email"])
    for key, value in values.items():
        setattr(user, key, value.strip() if isinstance(value, str) else value)
    db.commit(); db.refresh(user)
    return user_out(user)


@app.post("/api/admin/users", response_model=UserOut, status_code=201)
def admin_create_user(payload: UserCreate, admin: AdminOnly, db: Annotated[Session, Depends(get_db)]) -> UserOut:
    if db.scalar(select(User).where(or_(User.name == payload.name, payload.email is not None and User.email == payload.email))):
        raise HTTPException(status_code=409, detail="名字或邮箱已存在")
    user = User(name=payload.name.strip(), email=str(payload.email) if payload.email else None, school_name=payload.school_name, class_name=payload.class_name, password_hash=password_hash.hash(payload.password), role=payload.role)
    db.add(user); db.commit(); db.refresh(user)
    return user_out(user)


@app.post("/api/classrooms", response_model=ClassroomOut, status_code=201)
def create_class(payload: ClassroomCreate, teacher: TeacherOrAdmin, db: Annotated[Session, Depends(get_db)]) -> ClassroomOut:
    classroom = Classroom(name=payload.name.strip(), school_name=payload.school_name.strip(), teacher_id=teacher.id)
    db.add(classroom); db.commit(); db.refresh(classroom)
    return ClassroomOut.model_validate(classroom).model_copy(update={"student_count": 0})


@app.get("/api/classrooms", response_model=list[ClassroomOut])
def list_classes(user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> list[ClassroomOut]:
    if user.role == UserRole.ADMIN:
        classes = db.scalars(select(Classroom).options(selectinload(Classroom.members))).all()
    elif user.role == UserRole.TEACHER:
        classes = db.scalars(select(Classroom).options(selectinload(Classroom.members)).where(Classroom.teacher_id == user.id)).all()
    else:
        classes = db.scalars(select(Classroom).options(selectinload(Classroom.members)).join(ClassMember).where(ClassMember.student_id == user.id)).all()
    return [ClassroomOut.model_validate(item).model_copy(update={"student_count": len(item.members)}) for item in classes]


@app.post("/api/classrooms/{classroom_id}/students", response_model=ClassroomOut)
def add_student(classroom_id: int, payload: ClassMemberAdd, teacher: TeacherOrAdmin, db: Annotated[Session, Depends(get_db)]) -> ClassroomOut:
    classroom = check_class_access(db, classroom_id, teacher, manage=True)
    student = db.get(User, payload.student_id)
    if not student or student.role != UserRole.STUDENT:
        raise HTTPException(status_code=404, detail="学生不存在")
    if not db.scalar(select(ClassMember).where(ClassMember.classroom_id == classroom_id, ClassMember.student_id == student.id)):
        db.add(ClassMember(classroom_id=classroom_id, student_id=student.id)); db.commit()
    db.refresh(classroom)
    return ClassroomOut.model_validate(classroom).model_copy(update={"student_count": len(classroom.members)})


@app.get("/api/classrooms/{classroom_id}/students", response_model=list[UserOut])
def list_students(classroom_id: int, teacher: TeacherOrAdmin, db: Annotated[Session, Depends(get_db)]) -> list[UserOut]:
    check_class_access(db, classroom_id, teacher)
    users = db.scalars(select(User).join(ClassMember).where(ClassMember.classroom_id == classroom_id)).all()
    return [user_out(item) for item in users]


@app.post("/api/wordbooks", response_model=WordbookOut, status_code=201)
def create_wordbook(payload: WordbookCreate, user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> WordbookOut:
    if payload.kind == WordbookKind.SYSTEM and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="只有管理员可以创建系统词库")
    if payload.kind == WordbookKind.TEACHER and user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="只有教师可以创建班级词库")
    if payload.classroom_ids and user.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="只有教师可以给班级分配词库")
    book = Wordbook(name=payload.name.strip(), description=payload.description, kind=payload.kind, owner_id=user.id)
    db.add(book); db.flush()
    for item in payload.words:
        db.add(Word(wordbook_id=book.id, external_id=item.external_id, word=item.word.strip(), phonetic=item.phonetic, meaning=item.meaning, example_en=item.example_en, example_cn=item.example_cn, payload_json=item.model_dump_json()))
    for classroom_id in payload.classroom_ids:
        check_class_access(db, classroom_id, user, manage=True)
        db.add(ClassWordbook(classroom_id=classroom_id, wordbook_id=book.id, synced_version=book.source_version))
    db.commit(); db.refresh(book)
    return wordbook_out(accessible_wordbook(db, book.id, user))


@app.get("/api/wordbooks", response_model=list[WordbookOut])
def list_wordbooks(user: CurrentUser, db: Annotated[Session, Depends(get_db)], include_words: bool = Query(False)) -> list[WordbookOut]:
    query = select(Wordbook).where(Wordbook.is_active.is_(True)).options(selectinload(Wordbook.class_links), selectinload(Wordbook.words) if include_words else selectinload(Wordbook.words))
    if user.role == UserRole.ADMIN:
        books = db.scalars(query).all()
    else:
        class_ids = select(ClassMember.classroom_id).where(ClassMember.student_id == user.id)
        books = db.scalars(query.where(or_(Wordbook.kind == WordbookKind.SYSTEM, Wordbook.owner_id == user.id, Wordbook.class_links.any(ClassWordbook.classroom_id.in_(class_ids))))).all()
    return [wordbook_out(book) for book in books]


@app.get("/api/wordbooks/{wordbook_id}", response_model=WordbookOut)
def get_wordbook(wordbook_id: int, user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> WordbookOut:
    return wordbook_out(accessible_wordbook(db, wordbook_id, user))


@app.patch("/api/wordbooks/{wordbook_id}", response_model=WordbookOut)
def update_wordbook(wordbook_id: int, payload: WordbookUpdate, user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> WordbookOut:
    book = accessible_wordbook(db, wordbook_id, user)
    if user.role != UserRole.ADMIN and book.owner_id != user.id:
        raise HTTPException(status_code=403, detail="只有词库创建者或管理员可以更新词库")
    if payload.name is not None: book.name = payload.name.strip()
    if payload.description is not None: book.description = payload.description
    if payload.is_active is not None and user.role == UserRole.ADMIN: book.is_active = payload.is_active
    if payload.words is not None:
        book.words.clear()
        for item in payload.words:
            book.words.append(Word(external_id=item.external_id, word=item.word.strip(), phonetic=item.phonetic, meaning=item.meaning, example_en=item.example_en, example_cn=item.example_cn, payload_json=item.model_dump_json()))
        book.source_version += 1
    if payload.classroom_ids is not None:
        if user.role not in (UserRole.TEACHER, UserRole.ADMIN): raise HTTPException(status_code=403, detail="只有教师可以修改班级同步范围")
        for classroom_id in payload.classroom_ids: check_class_access(db, classroom_id, user, manage=True)
        book.class_links.clear()
        for classroom_id in payload.classroom_ids: book.class_links.append(ClassWordbook(classroom_id=classroom_id, synced_version=book.source_version))
    db.commit(); db.refresh(book)
    return wordbook_out(accessible_wordbook(db, book.id, user))


@app.post("/api/wordbooks/{wordbook_id}/sync", response_model=WordbookOut)
def sync_wordbook(wordbook_id: int, user: TeacherOrAdmin, db: Annotated[Session, Depends(get_db)]) -> WordbookOut:
    book = accessible_wordbook(db, wordbook_id, user)
    if user.role != UserRole.ADMIN and book.owner_id != user.id:
        raise HTTPException(status_code=403, detail="只有词库创建者或管理员可以同步词库")
    for link in book.class_links: link.synced_version = book.source_version
    db.commit(); db.refresh(book)
    return wordbook_out(book)


@app.post("/api/learning/records", response_model=LearningRecordOut, status_code=201)
def record_learning(payload: LearningRecordCreate, user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> LearningRecordOut:
    book = accessible_wordbook(db, payload.wordbook_id, user)
    word = db.get(Word, payload.word_id)
    if not word or word.wordbook_id != book.id: raise HTTPException(status_code=400, detail="单词不属于该词库")
    record = LearningRecord(student_id=user.id, wordbook_id=book.id, word_id=word.id, result=payload.result, stage=payload.stage, review_round=payload.review_round, reviewed_at=payload.reviewed_at or now_utc())
    db.add(record); db.commit(); db.refresh(record)
    return LearningRecordOut.model_validate(record)


@app.get("/api/learning/records", response_model=list[LearningRecordOut])
def list_learning_records(user: CurrentUser, db: Annotated[Session, Depends(get_db)], wordbook_id: int | None = None, limit: int = Query(200, ge=1, le=1000)) -> list[LearningRecordOut]:
    query = select(LearningRecord).where(LearningRecord.student_id == user.id).order_by(LearningRecord.reviewed_at.desc()).limit(limit)
    if wordbook_id is not None: query = query.where(LearningRecord.wordbook_id == wordbook_id)
    return [LearningRecordOut.model_validate(item) for item in db.scalars(query).all()]


@app.get("/api/learning/summary", response_model=list[LearningSummary])
def learning_summary(user: CurrentUser, db: Annotated[Session, Depends(get_db)]) -> list[LearningSummary]:
    rows = db.execute(select(LearningRecord.wordbook_id, func.count(LearningRecord.id), func.sum(LearningRecord.result == "known"), func.sum(LearningRecord.result == "wrong"), func.max(LearningRecord.reviewed_at)).where(LearningRecord.student_id == user.id).group_by(LearningRecord.wordbook_id)).all()
    return [LearningSummary(wordbook_id=row[0], total_events=int(row[1]), known_count=int(row[2] or 0), wrong_count=int(row[3] or 0), last_reviewed_at=row[4]) for row in rows]
