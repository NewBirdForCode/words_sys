from __future__ import annotations
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import Boolean, Date, DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

class UserRole(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"

class WordbookKind(str, Enum):
    SYSTEM = "system"
    TEACHER = "teacher"
    PERSONAL = "personal"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    school_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    class_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole), default=UserRole.STUDENT, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sessions: Mapped[list[SessionToken]] = relationship(back_populates="user", cascade="all, delete-orphan")
    memberships: Mapped[list[ClassMember]] = relationship(back_populates="student", cascade="all, delete-orphan")
    learning_records: Mapped[list[LearningRecord]] = relationship(back_populates="student", cascade="all, delete-orphan")

class SessionToken(Base):
    __tablename__ = "session_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user: Mapped[User] = relationship(back_populates="sessions")

class Classroom(Base):
    __tablename__ = "classrooms"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    school_name: Mapped[str] = mapped_column(String(160), index=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    teacher: Mapped[User] = relationship(foreign_keys=[teacher_id])
    members: Mapped[list[ClassMember]] = relationship(back_populates="classroom", cascade="all, delete-orphan")
    wordbooks: Mapped[list[ClassWordbook]] = relationship(back_populates="classroom", cascade="all, delete-orphan")

class ClassMember(Base):
    __tablename__ = "class_members"
    id: Mapped[int] = mapped_column(primary_key=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    classroom: Mapped[Classroom] = relationship(back_populates="members")
    student: Mapped[User] = relationship(back_populates="memberships")
    __table_args__ = (UniqueConstraint("classroom_id", "student_id", name="uq_class_member"),)

class Wordbook(Base):
    __tablename__ = "wordbooks"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    kind: Mapped[WordbookKind] = mapped_column(SqlEnum(WordbookKind), index=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    source_version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    words: Mapped[list[Word]] = relationship(back_populates="wordbook", cascade="all, delete-orphan")
    class_links: Mapped[list[ClassWordbook]] = relationship(back_populates="wordbook", cascade="all, delete-orphan")

class Word(Base):
    __tablename__ = "words"
    id: Mapped[int] = mapped_column(primary_key=True)
    wordbook_id: Mapped[int] = mapped_column(ForeignKey("wordbooks.id", ondelete="CASCADE"), index=True)
    external_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    word: Mapped[str] = mapped_column(String(160), index=True)
    phonetic: Mapped[str | None] = mapped_column(String(160), nullable=True)
    meaning: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    example_cn: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    wordbook: Mapped[Wordbook] = relationship(back_populates="words")

class ClassWordbook(Base):
    __tablename__ = "class_wordbooks"
    id: Mapped[int] = mapped_column(primary_key=True)
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id", ondelete="CASCADE"), index=True)
    wordbook_id: Mapped[int] = mapped_column(ForeignKey("wordbooks.id", ondelete="CASCADE"), index=True)
    synced_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    classroom: Mapped[Classroom] = relationship(back_populates="wordbooks")
    wordbook: Mapped[Wordbook] = relationship(back_populates="class_links")
    __table_args__ = (UniqueConstraint("classroom_id", "wordbook_id", name="uq_class_wordbook"),)

class LearningRecord(Base):
    __tablename__ = "learning_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    wordbook_id: Mapped[int] = mapped_column(ForeignKey("wordbooks.id", ondelete="CASCADE"), index=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"), index=True)
    result: Mapped[str] = mapped_column(String(20))
    stage: Mapped[str | None] = mapped_column(String(80), nullable=True)
    review_round: Mapped[int] = mapped_column(Integer, default=1)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    student: Mapped[User] = relationship(back_populates="learning_records")
    __table_args__ = (UniqueConstraint("student_id", "word_id", "reviewed_at", name="uq_learning_event"),)

class MistakeRecord(Base):
    __tablename__ = "mistake_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    wordbook_id: Mapped[int] = mapped_column(ForeignKey("wordbooks.id", ondelete="CASCADE"), index=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"), index=True)
    error_count: Mapped[int] = mapped_column(Integer, default=1)
    consecutive_correct: Mapped[int] = mapped_column(Integer, default=0)
    last_wrong_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_resolved_current: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (UniqueConstraint("student_id", "word_id", name="uq_student_mistake_word"),)

class MemoryProgress(Base):
    __tablename__ = "memory_progress"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    wordbook_id: Mapped[int] = mapped_column(ForeignKey("wordbooks.id", ondelete="CASCADE"), index=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id", ondelete="CASCADE"), index=True)
    first_learned_date: Mapped[str] = mapped_column(String(10))
    last_reviewed_date: Mapped[str] = mapped_column(String(10))
    next_review_date: Mapped[str] = mapped_column(String(10))
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0)
    interval_step: Mapped[int] = mapped_column(Integer, default=0)
    is_graduated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_manually_mastered: Mapped[bool] = mapped_column(Boolean, default=False)
    last_two_results_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    __table_args__ = (UniqueConstraint("student_id", "wordbook_id", "word_id", name="uq_memory_progress"),)

class PlanSettings(Base):
    __tablename__ = "plan_settings"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    wordbook_id: Mapped[int | None] = mapped_column(ForeignKey("wordbooks.id", ondelete="CASCADE"), nullable=True, index=True)
    daily_new_words: Mapped[int] = mapped_column(Integer, default=30)
    max_review_limit: Mapped[int] = mapped_column(Integer, default=30)
    interval_mode: Mapped[str] = mapped_column(String(20), default="standard")
    new_word_order: Mapped[str] = mapped_column(String(20), default="random")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    __table_args__ = (UniqueConstraint("student_id", "wordbook_id", name="uq_plan_settings"),)
