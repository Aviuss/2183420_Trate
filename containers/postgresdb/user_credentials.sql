CREATE TABLE IF NOT EXISTS user_credentials (
    uid SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    hash_password TEXT NOT NULL,
    salt TEXT NOT NULL
);
