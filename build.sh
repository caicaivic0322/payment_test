#!/bin/bash

# Render Build Script for Next.js Application
# This script optimizes the build process for Render deployment

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Clear any previous build cache
echo "Clearing previous build cache..."
rm -rf .next
rm -rf build

# Build the application
echo "Building the application..."
pnpm run build

echo "Build process completed successfully!"