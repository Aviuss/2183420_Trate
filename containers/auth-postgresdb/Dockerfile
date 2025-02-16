FROM postgres:17-alpine
COPY authorization_tokens.sql /docker-entrypoint-initdb.d/
COPY user_credentials.sql /docker-entrypoint-initdb.d/