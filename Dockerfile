FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Create data directory for token storage
RUN mkdir -p .data

EXPOSE 3000 3001

# Use Bun to run TypeScript directly
CMD ["bun", "run", "src/index.ts"]
