FROM node:22-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Create data directory for token storage
RUN mkdir -p .data

EXPOSE 3000 3001

# Use tsx to run TypeScript (ESM mode)
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
