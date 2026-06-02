import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "voice_agent")
MONGODB_SERVER_SELECTION_TIMEOUT_MS = int(
    os.getenv("MONGODB_SERVER_SELECTION_TIMEOUT_MS", "5000")
)

_client: Optional[MongoClient] = None
_db: Optional[Database] = None
logger = logging.getLogger(__name__)


def get_db() -> Database:
    global _client, _db
    if _db is None:
        try:
            _client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=MONGODB_SERVER_SELECTION_TIMEOUT_MS,
            )
            # Prefer database from MONGODB_URI path so Python and Node share the same DB.
            # Falls back to MONGODB_DB_NAME if URI has no path component.
            default_db = _client.get_default_database(default=None)
            _db = default_db if default_db is not None else _client[MONGODB_DB_NAME]
        except Exception as exc:
            logger.exception("Failed to initialize MongoDB client: %s", exc)
            raise RuntimeError(
                "MongoDB is unavailable. Check MONGODB_URI/network connectivity and try again."
            ) from exc
    return _db


def get_collection(name: str) -> Collection:
    return get_db()[name]

class LazyCollection:
    def __init__(self, name: str) -> None:
        self.name = name

    def _collection(self) -> Collection:
        return get_collection(self.name)

    def __getattr__(self, attr: str):
        return getattr(self._collection(), attr)


clients = LazyCollection("Pharmacies")
call_transcripts = LazyCollection("Live_Conversations")
orders = LazyCollection("Orders")
medicines = LazyCollection("Medicines")
trigger_words = LazyCollection("keyword_extractions")
