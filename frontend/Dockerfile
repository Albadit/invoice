FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Copy environment file
COPY .env.example .env

# Install dependencies
RUN npm install

# Run entrypoint script
RUN chmod +x /app/docker-entrypoint.sh

# Build the application
RUN npm run build

# Use entrypoint script to handle migrations and startup
ENTRYPOINT ["/app/docker-entrypoint.sh"]
