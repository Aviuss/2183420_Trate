# 2183420_Trate

Command to remove containers and their volumes and then freshly build new environment:
docker-compose down -v && docker-compose --env-file .env up --build  

cp .env.example .env
docker-compose --env-file .env up --build  