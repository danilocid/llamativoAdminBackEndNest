FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=8080

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/main.js"]
