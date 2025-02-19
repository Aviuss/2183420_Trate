CREATE TABLE IF NOT EXISTS translations (
    np SERIAL PRIMARY KEY,
    id TEXT NOT NULL,
    submituid TEXT NOT NULL,
    original_text TEXT NOT NULL,
    original_lang TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    translated_lang TEXT NOT NULL,
    who_translated TEXT NOT NULL
);
