# Use Node.js 24 on Alpine Linux (small image)
FROM node:24-alpine

# Install Chromium and dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use the installed Chromium instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory inside container
WORKDIR /app

# Build arguments for Supabase (required at build time for Next.js NEXT_PUBLIC_* variables)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Copy the project files
COPY . .

# Install dependencies from package.json
RUN npm install

# Run npm audit fix --force until 0 vulnerabilities (max 5 attempts)
RUN sh -c '\
    i=0; \
    while [ $i -lt 5 ]; do \
      if npm audit 2>&1 | grep -q "found 0 vulnerabilities"; then \
        echo "No vulnerabilities found."; \
        break; \
      fi; \
      i=$((i + 1)); \
      echo "Attempt $i/5: running npm audit fix --force..."; \
      npm audit fix --force || break; \
    done'

# Build the Next.js app for production
RUN npm run build

# Start the Next.js production server
CMD ["npm", "start"]