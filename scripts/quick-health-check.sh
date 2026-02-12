#!/bin/bash

# Quick health check for codespace
# Provides a fast, lightweight status overview

echo "=== Codespace Health Check ==="

if [ -n "$CODESPACE_NAME" ]; then
    echo "Codespace Name: $CODESPACE_NAME"
else
    echo "Codespace Name: (not in codespace)"
fi

echo "Node Version: $(node --version 2>/dev/null || echo 'Not installed')"

if command -v bun &> /dev/null; then
    echo "Package Manager: $(which bun) (bun)"
elif command -v npm &> /dev/null; then
    echo "Package Manager: $(which npm) (npm)"
else
    echo "Package Manager: Not found"
fi

echo -n "Dependencies: "
if [ -d node_modules ]; then
    echo "✓ Installed"
else
    echo "✗ Not installed"
fi

echo -n "Port 5173: "
if command -v nc &> /dev/null && nc -z localhost 5173 2>/dev/null; then
    echo "✓ Open"
else
    echo "⚠ Not listening"
fi
