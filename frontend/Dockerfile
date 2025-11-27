FROM node:20-alpine

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dos2unix

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Copy environment file
COPY .env.example .env

# Install dependencies
RUN npm install

# Fix line endings and make entrypoint script executable
RUN dos2unix /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

# Build the application
RUN npm run build

# Use entrypoint script to handle migrations and startup
ENTRYPOINT ["/app/docker-entrypoint.sh"]
