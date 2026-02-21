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

# Copy all project files into container
COPY . .

# Install dependencies from package.json
RUN npm install

# Build the Next.js app for production
RUN npm run build

# Start the Next.js production server
CMD ["npm", "start"]