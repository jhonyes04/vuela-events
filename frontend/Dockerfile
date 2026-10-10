FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Vite incrusta estas variables al compilar: no basta con ponerlas en runtime.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL
RUN pnpm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache curl

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
