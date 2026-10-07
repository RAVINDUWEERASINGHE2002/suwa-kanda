# ==========================================
# Suwa Kanda (සුව කැඳ) - Multi-Stage Dockerfile
# Production-ready deployment for Shop PCs & Tablets
# ==========================================

# Stage 1: Build React Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Install build dependencies for better-sqlite3 native compilation on alpine if needed
RUN apk add --no-cache python3 make g++ sqlite

# Install server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy server code
COPY server/src ./src
COPY server/suwa_kanda.db* ./
COPY server/.env.example ./.env

# Copy built frontend dist from Stage 1
COPY --from=client-builder /app/client/dist /app/client/dist

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/suwa_kanda.db

# Expose port 3000 for local network access (Cashier, KDS, Reports)
EXPOSE 3000

# Start Express + Socket.IO server serving frontend and APIs
CMD ["node", "src/index.js"]
