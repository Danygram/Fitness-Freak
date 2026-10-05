# Host-agnostic container (works on Fly.io, Railway, Render-as-Docker, etc.).
# Builds the client, then serves it from the Express API on one port.
FROM node:22-slim
WORKDIR /app

# Install client deps and build the static frontend.
COPY client/package*.json client/
RUN npm --prefix client install
COPY client/ client/
RUN npm --prefix client run build

# Install server deps (prod only) and copy the server.
COPY server/package*.json server/
RUN npm --prefix server install --omit=dev
COPY server/ server/

ENV NODE_ENV=production
# The platform injects PORT; the server falls back to 4000 locally.
EXPOSE 4000
CMD ["node", "server/src/index.js"]
