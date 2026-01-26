#!/usr/bin/env bash

# Install required Chrome dependencies at runtime
echo "Installing Chrome dependencies..."
apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    fonts-liberation \
    libappindicator3-1 \
    xdg-utils \
    ca-certificates \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

echo "Dependencies installed. Starting server..."

# Set Chromium path for Puppeteer (used by Remotion)
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Navigate to the server directory
cd remotion-render-server || { echo "Error: remotion-render-server directory not found"; exit 1; }

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install || { echo "Failed to install dependencies"; exit 1; }
fi

# Start the server
echo "Starting Remotion render server..."
npm start
