#!/bin/bash

# Navigate to the server directory
cd remotion-render-server

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the server
echo "Starting Remotion render server..."
npm start
