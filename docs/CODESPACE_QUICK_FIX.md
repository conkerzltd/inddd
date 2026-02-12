# Codespace Connection Error - Quick Reference

## Error: "Failed to connect to codespace. Codespace..."

### 🚀 Quick Fix (Try This First)
```bash
# Run the diagnostic tool
npm run diagnose
```

### ⏱️ Most Common Cause: Container Still Starting
**Solution:** Wait 30-60 seconds, then click "Reload Window" or refresh your browser.

### 📋 Step-by-Step Troubleshooting

#### Step 1: Check Container Status
1. Go to https://github.com/codespaces
2. Find your codespace
3. Click "..." → "View creation log"
4. Wait for "Finished configuring codespace"

#### Step 2: Force Reconnect
- **VS Code Desktop:** Press F1 → "Codespaces: Reconnect"
- **Browser:** Refresh the page (Ctrl+R / Cmd+R)

#### Step 3: Restart Codespace
1. GitHub.com → Your Codespaces
2. Click "..." → "Stop"
3. Wait 10 seconds
4. Click "Open in VS Code" or "Open in browser"

#### Step 4: Rebuild Container
1. In VS Code: Press F1
2. Type: "Codespaces: Rebuild Container"
3. Select "Rebuild Container"

#### Step 5: Check GitHub Status
Visit https://www.githubstatus.com/
- If there's an incident, wait for resolution

### 🔍 Advanced Diagnostics

#### Check Environment
```bash
# Verify you're in a codespace
echo $CODESPACE_NAME

# Check Node.js
node --version

# Check dependencies
ls -la node_modules/
```

#### Install Dependencies Manually
```bash
# If postCreateCommand failed
bun install || npm install
```

#### Check Port Forwarding
```bash
# Verify dev server port
nc -z localhost 5173 && echo "Port is open" || echo "Port not available"
```

### 🛠️ VS Code Tasks
Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and select:
- "Tasks: Run Task" → "Diagnose Codespace Connection"
- "Tasks: Run Task" → "Check Codespace Health"

### 📚 Full Documentation
See [CODESPACE_TROUBLESHOOTING.md](./CODESPACE_TROUBLESHOOTING.md) for complete guide.

### ❓ Still Not Working?

1. **Try VS Code Desktop instead of browser**
   - Install GitHub Codespaces extension
   - File → Preferences → Settings → search "Codespaces"

2. **Check network/firewall**
   - Ensure `*.github.dev` is not blocked
   - Try on a different network
   - Disable VPN temporarily

3. **Create fresh codespace**
   - Commit/push any work
   - Delete old codespace
   - Create new one from same branch

### 🆘 Get Help
If issues persist, file an issue with:
- Full error message
- Last 80-120 lines of creation log
- Browser/client version
- Output of `npm run diagnose`
