#!/bin/bash

# GitHub Codespaces Connection Diagnostic Script
# This script helps diagnose and fix common connection issues

set -e

echo "================================================"
echo "GitHub Codespaces Connection Diagnostic Tool"
echo "================================================"
echo ""

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

print_section() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Check if we're running in a codespace
print_section "Environment Check"
if [ -n "$CODESPACE_NAME" ]; then
    print_status "OK" "Running in GitHub Codespace: $CODESPACE_NAME"
else
    print_status "WARN" "Not running in a GitHub Codespace environment"
fi

# Check Node.js installation
print_section "Runtime Environment"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "OK" "Node.js installed: $NODE_VERSION"
else
    print_status "ERROR" "Node.js is not installed"
fi

# Check npm/bun installation
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    print_status "OK" "Bun installed: $BUN_VERSION"
elif command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "OK" "npm installed: $NPM_VERSION"
else
    print_status "ERROR" "No package manager (npm/bun) found"
fi

# Check if dependencies are installed
print_section "Dependencies Check"
if [ -d "node_modules" ]; then
    print_status "OK" "node_modules directory exists"
    
    # Check if key dependencies exist
    if [ -d "node_modules/react" ]; then
        print_status "OK" "React dependency found"
    else
        print_status "WARN" "React dependency missing"
    fi
    
    if [ -d "node_modules/vite" ]; then
        print_status "OK" "Vite dependency found"
    else
        print_status "WARN" "Vite dependency missing"
    fi
else
    print_status "ERROR" "node_modules directory not found - run 'npm install' or 'bun install'"
fi

# Check port forwarding
print_section "Port Forwarding"
if [ -n "$CODESPACE_NAME" ]; then
    print_status "INFO" "Expected forwarded port: 5173 (Vite dev server)"
    
    if command -v nc &> /dev/null; then
        if nc -z localhost 5173 2>/dev/null; then
            print_status "OK" "Port 5173 is open"
        else
            print_status "WARN" "Port 5173 is not listening (start dev server with 'npm run dev')"
        fi
    fi
fi

# Check VS Code extensions
print_section "VS Code Extensions"
if command -v code &> /dev/null; then
    if code --list-extensions | grep -q "dbaeumer.vscode-eslint"; then
        print_status "OK" "ESLint extension installed"
    else
        print_status "WARN" "ESLint extension not found"
    fi
    
    if code --list-extensions | grep -q "esbenp.prettier-vscode"; then
        print_status "OK" "Prettier extension installed"
    else
        print_status "WARN" "Prettier extension not found"
    fi
fi

# Check git status
print_section "Git Repository"
if [ -d ".git" ]; then
    print_status "OK" "Git repository initialized"
    
    BRANCH=$(git branch --show-current 2>/dev/null)
    if [ -n "$BRANCH" ]; then
        print_status "INFO" "Current branch: $BRANCH"
    fi
else
    print_status "ERROR" "Not a git repository"
fi

# Check disk space
print_section "System Resources"
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    print_status "OK" "Disk usage: ${DISK_USAGE}%"
else
    print_status "WARN" "Disk usage is high: ${DISK_USAGE}%"
fi

# Provide recommendations
print_section "Recommendations"
echo ""

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Action Required:${NC} Install dependencies"
    echo "  Run: bun install || npm install"
    echo ""
fi

if [ -n "$CODESPACE_NAME" ]; then
    echo -e "${BLUE}Common Connection Error Fixes:${NC}"
    echo ""
    echo "1. If you see 'Failed to connect to codespace. Codespace <name>':"
    echo "   - This usually means the container is still initializing"
    echo "   - Wait 30-60 seconds and try reconnecting"
    echo "   - Check creation logs: Codespaces menu → 'View creation log'"
    echo ""
    echo "2. If connection repeatedly fails:"
    echo "   - Stop and restart the codespace"
    echo "   - Try 'Rebuild Container' from codespace menu"
    echo "   - Check GitHub Status: https://www.githubstatus.com/"
    echo ""
    echo "3. If using VS Code Desktop:"
    echo "   - Update to latest VS Code version"
    echo "   - Update GitHub Codespaces extension"
    echo "   - Try connecting via browser first"
    echo ""
fi

echo -e "${GREEN}Diagnostic complete!${NC}"
echo ""
echo "For more help, see: docs/CODESPACE_TROUBLESHOOTING.md"
echo "================================================"
