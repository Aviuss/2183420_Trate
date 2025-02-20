CREATE TABLE IF NOT EXISTS user_credentials (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hash_password TEXT NOT NULL,
    salt TEXT NOT NULL
);
