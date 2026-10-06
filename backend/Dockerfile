FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm run db:generate && pnpm run build

EXPOSE 3001

CMD ["node", "--env-file-if-exists=.env", "dist/index.js"]