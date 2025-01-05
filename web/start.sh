#!/bin/bash
# This script is used to start the production server on managed servers like Hetzner

# Check if .env file exists
if [ -f .env ]; then
    # Read .env file and format variables for inline usage
    ENV_VARS=$(cat .env | grep -v '^#' | xargs)
    
    # Run npm start with variables inline using env command
    env $ENV_VARS npm run start
else
    echo "Error: .env file not found"
    exit 1
fi
