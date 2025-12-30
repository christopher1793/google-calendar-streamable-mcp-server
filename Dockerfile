FROM node:22-alpine

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

# Use tsx to run TypeScript
CMD ["npx", "tsx", "src/index.ts"]
