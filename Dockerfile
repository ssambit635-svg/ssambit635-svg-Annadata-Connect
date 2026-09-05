# ---------- Stage 1: build the frontend ----------
FROM node:22-alpine AS fe-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# VITE_API_BASE_URL left empty at build time → the app calls the API on the
# SAME ORIGIN (the Express server that serves this build). If you host the
# frontend separately, build with: --build-arg / -e VITE_API_BASE_URL=https://api.example.com
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---------- Stage 2: backend runtime (serves API + built frontend) ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY backend/ ./
COPY --from=fe-build /app/frontend/dist /app/frontend/dist
# Persist the JSON data store outside the image layer when a volume is mounted.
VOLUME /app/backend/data
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=4s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "src/index.js"]
