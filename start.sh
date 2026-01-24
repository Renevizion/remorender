#!/bin/bash

# Set Chromium path for Puppeteer (used by Remotion)
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Navigate to the server directory
cd remotion-render-server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install || { echo "Failed to install dependencies"; exit 1; }
fi

# Start the server
echo "Starting Remotion render server..."
npm start
