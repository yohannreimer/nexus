FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build && npm run build:server

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY postgres ./postgres
COPY scripts ./scripts

EXPOSE 3001
CMD ["sh", "-c", "node scripts/write-runtime-env.mjs && npm run db:migrate && npm start"]
