CREATE TABLE IF NOT EXISTS translations_grade (
    np SERIAL PRIMARY KEY,
    id TEXT NOT NULL,
    ai_grade INTEGER NOT NULL,
    human_grade INTEGER NOT NULL,
    uid_grading TEXT NOT NULL
);
