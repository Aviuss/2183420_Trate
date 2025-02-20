FROM node:23-alpine
RUN apk add --no-cache curl
WORKDIR /usr/src/app
COPY . .
RUN npm install
CMD [ "npm", "run", "start" ]
EXPOSE 5010