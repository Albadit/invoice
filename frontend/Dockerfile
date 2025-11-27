FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Copy environment file
COPY .env.example .env

# Install dependencies
RUN npm install

# Fix line endings and make entrypoint script executable
RUN apk add --no-cache dos2unix && \
    dos2unix /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh && \
    apk del dos2unix

# Build the application
RUN npm run build

# Use entrypoint script to handle migrations and startup
ENTRYPOINT ["/app/docker-entrypoint.sh"]
