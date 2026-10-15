from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Word, Wordbook, WordbookKind

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "system_wordbooks.json"


def seed_system_wordbooks(db: Session) -> tuple[int, int]:
    """Import the bundled final vocabulary into the backend as active system books.

    The external IDs come from the source-final.zip frontend data, so rerunning this
    function updates existing records instead of creating duplicates.
    """
    if not DATA_PATH.exists():
        return 0, 0
    books: list[dict[str, Any]] = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    imported_books = 0
    imported_words = 0
    source_ids = {str(item["external_id"]) for item in books}

    # Any old manually-created system book is no longer part of the final curated set.
    for legacy in db.scalars(
        select(Wordbook).where(Wordbook.kind == WordbookKind.SYSTEM, Wordbook.external_id.is_(None))
    ).all():
        legacy.is_active = False

    for item in books:
        external_id = str(item["external_id"])
        book = db.scalar(select(Wordbook).where(Wordbook.external_id == external_id))
        if book is None:
            book = Wordbook(
                external_id=external_id,
                name=item["name"],
                description=item.get("description"),
                kind=WordbookKind.SYSTEM,
                owner_id=None,
            )
            db.add(book)
            db.flush()
            imported_books += 1
        book.name = item["name"]
        book.description = item.get("description")
        book.kind = WordbookKind.SYSTEM
        book.owner_id = None
        book.is_active = True
        book.source_version = 1

        existing = {
            word.external_id: word
            for word in book.words
            if word.external_id
        }
        for word_data in item.get("words", []):
            word_external_id = str(word_data["external_id"])
            word = existing.get(word_external_id)
            if word is None:
                word = Word(wordbook_id=book.id, external_id=word_external_id)
                db.add(word)
                imported_words += 1
            word.word = word_data["word"]
            word.phonetic = word_data.get("phonetic")
            word.meaning = word_data.get("meaning")
            word.example_en = word_data.get("example_en")
            word.example_cn = word_data.get("example_cn")
            word.payload_json = json.dumps(word_data.get("payload", {}), ensure_ascii=False)

    db.commit()
    return len(books), sum(len(item.get("words", [])) for item in books)
