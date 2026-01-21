# Backend Dockerfile
FROM node:20-slim AS builder

# Install build dependencies including OpenSSL
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-slim

# Install runtime dependencies:
# - openssl: Required for Prisma
# - graphicsmagick: Required for pdf2pic (PDF to image conversion)
# - ghostscript: Required for GraphicsMagick to handle PDFs
# - poppler-utils: Additional PDF tools
RUN apt-get update -y && apt-get install -y \
    openssl \
    graphicsmagick \
    ghostscript \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy built files
COPY --from=builder /app/dist ./dist

# Create uploads directory and temp directory for OCR
RUN mkdir -p uploads logs uploads/temp_ocr

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/app.js"]

