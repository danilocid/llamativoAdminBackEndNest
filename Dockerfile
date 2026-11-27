FROM node:24-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=8080
ENV TZ=America/Santiago

WORKDIR /app

# Gestor de paquetes: pnpm (misma versión que "packageManager" en package.json)
RUN npm install -g pnpm@11.1.3

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 8080

CMD ["node", "dist/main.js"]
