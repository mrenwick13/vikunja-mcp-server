FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
RUN npm install --no-audit --no-fund --ignore-scripts \
 && npm run build \
 && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
LABEL io.modelcontextprotocol.server.name="io.github.mrenwick13/vikunja-mcp-server"
ENTRYPOINT ["node", "dist/index.js"]
