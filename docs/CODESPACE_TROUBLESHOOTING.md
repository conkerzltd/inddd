# GitHub Codespaces Troubleshooting Guide

This guide helps resolve common issues when opening GitHub Codespaces for this repository.

## Quick Fixes

### Phase 1: Check for Platform Incidents
1. Visit [GitHub Status](https://www.githubstatus.com/) to check for Codespaces outages
2. If there's an incident, wait for resolution or try VS Code Desktop connection

### Phase 2: Non-Destructive Restarts
1. **Stop the Codespace**: Go to GitHub → Codespaces → "..." menu → Stop
2. **Start Again**: Click "Open in browser" or "Open in VS Code"
3. **Rebuild Container**: If still failing, use "..." menu → "Rebuild Container"

### Phase 3: View Creation Logs
To diagnose the issue:
1. Go to GitHub → Codespaces → "..." menu → "View creation log"
2. Look for ERROR messages or non-zero exit codes
3. Common issues to look for:
   - `bun install` failures
   - Network timeouts
   - Permission errors

## Common Issues and Solutions

### Issue: `bun install` fails
The devcontainer is configured with a fallback:
```json
"postCreateCommand": "bun install || npm install"
```
If bun fails, npm will be used as a fallback.

### Issue: Container image pull fails
Try rebuilding with "Full Rebuild":
1. Codespaces → "..." menu → "Full Rebuild Container"

### Issue: Port 5173 not accessible
The development server (Vite) runs on port 5173. Ensure:
1. The port is forwarded in your Codespace
2. Check the "Ports" tab in VS Code for port 5173

### Issue: VS Code extensions not loading
1. Check the Extensions view (Ctrl+Shift+X)
2. Manually install if missing:
   - ESLint (`dbaeumer.vscode-eslint`)
   - Prettier (`esbenp.prettier-vscode`)

## Browser-Specific Issues

### Try these steps:
1. Open in Incognito/Private mode
2. Disable browser extensions (especially ad blockers)
3. Try a different browser
4. Try VS Code Desktop instead of browser

## Network Issues

### Corporate/VPN Networks:
1. Ensure `*.github.dev` is allowlisted
2. Try switching to mobile hotspot
3. Disable VPN temporarily

## Creating a Fresh Codespace

If all else fails:
1. **Commit and push** any work from the failing Codespace
2. Delete the old Codespace
3. Create a new Codespace from the same branch

## DevContainer Configuration

Current configuration (`.devcontainer/devcontainer.json`):
- **Base image**: `mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm`
- **Package manager**: Bun (with npm fallback)
- **Node version**: 22
- **Extensions**: ESLint, Prettier
- **Forwarded ports**: 5173 (Vite dev server)

## Getting Help

If issues persist:
1. Check the [GitHub Community Discussions](https://github.com/orgs/community/discussions)
2. File an issue in this repository with:
   - Exact error message
   - Last 80-120 lines of creation log
   - Browser/client being used
