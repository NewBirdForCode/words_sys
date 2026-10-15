from __future__ import annotations
from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from .models import UserRole, WordbookKind

class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    email: EmailStr | None = None
    city_name: str | None = Field(default=None, max_length=80)
    district_name: str | None = Field(default=None, max_length=80)
    school_name: str | None = Field(default=None, max_length=160)
    class_name: str | None = Field(default=None, max_length=160)
    role: UserRole = UserRole.STUDENT

class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    email: EmailStr | None = None
    city_name: str | None = Field(default=None, max_length=80)
    district_name: str | None = Field(default=None, max_length=80)
    school_name: str | None = Field(default=None, max_length=160)
    class_name: str | None = Field(default=None, max_length=160)
    password: str | None = Field(default=None, min_length=8, max_length=128)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; name: str; email: EmailStr | None; city_name: str | None; district_name: str | None; school_name: str | None; class_name: str | None
    role: UserRole; is_active: bool; created_at: datetime

class LoginRequest(BaseModel):
    name_or_email: str
    password: str

class TokenOut(BaseModel):
    access_token: str; token_type: str = "bearer"; expires_at: datetime; user: UserOut

class ClassroomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    city_name: str = Field(min_length=1, max_length=80)
    district_name: str = Field(min_length=1, max_length=80)
    school_name: str = Field(min_length=1, max_length=160)

class ClassroomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; name: str; city_name: str | None; district_name: str | None; school_name: str; teacher_id: int; created_at: datetime; student_count: int = 0; invite_code: str | None = None

class ClassMemberAdd(BaseModel):
    student_id: int

class JoinClassroomRequest(BaseModel):
    invite_code: str = Field(pattern=r"^\d{8}$", description="8 位数字班级邀请码")

class WordInput(BaseModel):
    external_id: str | None = None; word: str = Field(min_length=1, max_length=160)
    phonetic: str | None = None; meaning: str | None = None; example_en: str | None = None; example_cn: str | None = None
    payload: dict[str, Any] | None = None

class WordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; external_id: str | None; word: str; phonetic: str | None; meaning: str | None; example_en: str | None; example_cn: str | None

class WordbookCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200); description: str | None = None
    kind: WordbookKind = WordbookKind.PERSONAL; classroom_ids: list[int] = Field(default_factory=list); words: list[WordInput] = Field(default_factory=list)

class WordbookUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200); description: str | None = None
    is_active: bool | None = None; words: list[WordInput] | None = None; classroom_ids: list[int] | None = None

class WordbookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; name: str; description: str | None; kind: WordbookKind; owner_id: int | None; source_version: int
    is_active: bool; created_at: datetime; updated_at: datetime; words: list[WordOut] = []; classroom_ids: list[int] = []

class LearningRecordCreate(BaseModel):
    wordbook_id: int; word_id: int; result: str = Field(pattern="^(known|wrong|skipped)$"); stage: str | None = None
    review_round: int = Field(default=1, ge=1); reviewed_at: datetime | None = None

class LearningRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; student_id: int; wordbook_id: int; word_id: int; result: str; stage: str | None; review_round: int; reviewed_at: datetime

class LearningSummary(BaseModel):
    wordbook_id: int; total_events: int; known_count: int; wrong_count: int; last_reviewed_at: datetime | None

class MistakeUpsert(BaseModel):
    word_id: int
    wordbook_id: int | None = None

class MistakeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int; student_id: int; wordbook_id: int; word_id: int; error_count: int; consecutive_correct: int
    last_wrong_at: datetime; last_reviewed_at: datetime | None; resolved_at: datetime | None; is_resolved_current: bool

class MemoryProgressUpsert(BaseModel):
    wordbook_id: int; word_id: int; first_learned_date: str; last_reviewed_date: str; next_review_date: str
    correct_count: int = 0; wrong_count: int = 0; interval_step: int = 0; is_graduated: bool = False
    is_manually_mastered: bool = False; last_two_results: list[bool] = Field(default_factory=list)

class MemoryProgressOut(MemoryProgressUpsert):
    model_config = ConfigDict(from_attributes=True)
    id: int; student_id: int; updated_at: datetime

class PlanSettingsUpsert(BaseModel):
    wordbook_id: int | None = None; daily_new_words: int = Field(default=30, ge=10, le=100)
    max_review_limit: int = Field(default=30, ge=0, le=100); interval_mode: str = Field(default="standard", pattern="^(standard|relaxed)$")
    new_word_order: str = Field(default="random", pattern="^(random|alphabetical)$")

class PlanSettingsOut(PlanSettingsUpsert):
    model_config = ConfigDict(from_attributes=True)
    id: int; student_id: int; updated_at: datetime
