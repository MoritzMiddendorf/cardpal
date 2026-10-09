# Production image: builds all packages, then runs the server, which also serves the client.
FROM node:26-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile
COPY packages ./packages
RUN pnpm build \
 && pnpm --filter @cardpal/server deploy --prod --legacy /out \
 && mkdir -p /out/client && cp -r packages/client/dist /out/client/dist

FROM node:26-alpine
ENV NODE_ENV=production PORT=3001
WORKDIR /app/server
COPY --from=build /out /app/server
# server/dist/index.js serves ../../client/dist -> /app/client/dist
RUN mv /app/server/client /app/client
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
