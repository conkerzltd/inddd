# VS Code + GitHub Codespaces: Deleted Codespace Connection Error

## Problem

You deleted an old codespace manually, then created a new one, but VS Code Desktop still shows:
```
"Failed to connect to codespace ... has been deleted or you do not have permission to use it."
```

## Root Cause

**PRIMARY HYPOTHESIS:** VS Code is trying to reconnect to the DELETED codespace due to stale recent connection cache or cached authentication state. The fix is to connect explicitly to the NEW codespace and clear local caches/tokens if needed.

---

## Quick Start (Try This First)

1. **[Browser: GitHub]** Open https://github.com/codespaces and open the NEW codespace in browser
2. **[VS Code: Command Palette]** Run `Codespaces: Connect to Codespace` and select the NEW one
3. If it still fails, proceed immediately to **PHASE 5: Clear Local Codespaces Cache** (most effective)

---

## Complete Troubleshooting Guide

### PHASE 1 — CONFIRM NEW CODESPACE EXISTS

**[Browser: GitHub]**

1. Open: https://github.com/codespaces
2. Confirm you see a NEW codespace (different name than the deleted one)
3. Click it → "Open in browser"

**Expected result:** Web VS Code opens successfully.

**If this fails:** Stop and investigate GitHub permissions/SSO/org policy. Ask admin for screenshot of the codespaces page and whether the repo is under an organization.

---

### PHASE 2 — CONNECT TO THE NEW CODESPACE

**[VS Code: Command Palette]**

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Run: `Remote: Close Remote Connection`
3. Run: `Codespaces: Connect to Codespace`
4. Select the NEW codespace from the list (do NOT click Retry on the old error dialog)

**Expected result:** VS Code connects to the new codespace.

---

### PHASE 3 — HARD REFRESH VS CODE SESSION

**[VS Code: Command Palette]**

1. `Ctrl+Shift+P` → `Developer: Reload Window`
2. `Ctrl+Shift+P` → `Codespaces: Connect to Codespace`

**Expected result:** New codespace appears and connects.

---

### PHASE 4 — SIGN OUT / SIGN IN (Fix Wrong Account Tokens)

**[VS Code: Command Palette]**

1. `Ctrl+Shift+P` → `GitHub: Sign out`
2. `Ctrl+Shift+P` → `GitHub: Sign in`
3. `Ctrl+Shift+P` → `Codespaces: Connect to Codespace` → select NEW codespace

**Expected result:** Connection works under correct GitHub account.

---

### PHASE 5 — CLEAR LOCAL CODESPACES CACHE (Most Effective)

**⚠️ IMPORTANT:** You MUST close VS Code completely before doing this.

#### Windows

**[Local PC: File Explorer]**

1. Close VS Code (all windows)
2. In File Explorer, paste this path in the address bar:
   ```
   %APPDATA%\Code\User\globalStorage\
   ```
3. Delete these folders if they exist:
   - `github.codespaces`
   - `github.github`
   - `github.vscode-pull-request-github`

**Note:** If you use VS Code Insiders, use:
```
%APPDATA%\Code - Insiders\User\globalStorage\
```

#### macOS

**[Local PC: Terminal]**

1. Close VS Code (all windows)
2. Run these commands:
   ```bash
   rm -rf ~/Library/Application\ Support/Code/User/globalStorage/github.codespaces
   rm -rf ~/Library/Application\ Support/Code/User/globalStorage/github.github
   rm -rf ~/Library/Application\ Support/Code/User/globalStorage/github.vscode-pull-request-github
   ```

**Note:** If you use VS Code Insiders:
```bash
rm -rf ~/Library/Application\ Support/Code\ -\ Insiders/User/globalStorage/github.codespaces
rm -rf ~/Library/Application\ Support/Code\ -\ Insiders/User/globalStorage/github.github
rm -rf ~/Library/Application\ Support/Code\ -\ Insiders/User/globalStorage/github.vscode-pull-request-github
```

#### Linux

**[Local PC: Terminal]**

1. Close VS Code (all windows)
2. Run these commands:
   ```bash
   rm -rf ~/.config/Code/User/globalStorage/github.codespaces
   rm -rf ~/.config/Code/User/globalStorage/github.github
   rm -rf ~/.config/Code/User/globalStorage/github.vscode-pull-request-github
   ```

**Note:** If you use VS Code Insiders:
```bash
rm -rf ~/.config/Code\ -\ Insiders/User/globalStorage/github.codespaces
rm -rf ~/.config/Code\ -\ Insiders/User/globalStorage/github.github
rm -rf ~/.config/Code\ -\ Insiders/User/globalStorage/github.vscode-pull-request-github
```

#### After Clearing Cache

**[VS Code: Command Palette]**

1. Open VS Code
2. `Ctrl+Shift+P` → `GitHub: Sign in`
3. `Ctrl+Shift+P` → `Codespaces: Connect to Codespace` → select NEW codespace

**Expected result:** Old deleted codespace is no longer referenced; connection succeeds.

---

### PHASE 6 — FORCE OPEN FROM THE WEB (Bypasses "Recent")

**[Browser: GitHub]**

1. Go to https://github.com/codespaces
2. Open the NEW codespace
3. Click: "Open in Visual Studio Code" (desktop)

**Expected result:** VS Code opens directly to the correct codespace.

---

## Optional Diagnostic Commands

**Only run these AFTER connection succeeds**

**[VS Code: Terminal inside Codespace]**

```bash
git status
git log -1 --oneline
```

**Expected result:** Confirms you are in the correct repo/branch and on latest commit.

---

## Verification Checklist

Use this checklist to confirm the issue is resolved:

- [ ] The codespace name in the VS Code error is NOT the same as the one you are trying to open
- [ ] The new codespace appears on https://github.com/codespaces
- [ ] "Open in browser" works for the new codespace
- [ ] VS Code Desktop connects via "Codespaces: Connect to Codespace"
- [ ] After cache wipe, the old codespace name never appears again

---

## Additional Resources

- [GitHub Codespaces Troubleshooting Guide](./CODESPACE_TROUBLESHOOTING.md) - For general connection issues
- [Quick Fix Reference](./CODESPACE_QUICK_FIX.md) - For fast solutions to common problems
- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [VS Code Remote Development](https://code.visualstudio.com/docs/remote/remote-overview)

---

## Still Having Issues?

If none of these steps work:

1. **Update VS Code and Extensions**
   - Update VS Code to the latest version
   - Update the GitHub Codespaces extension
   - Restart VS Code

2. **Check GitHub Organization Settings**
   - Some organizations restrict Codespaces access
   - Verify you have the correct permissions
   - Contact your organization admin if needed

3. **Try Alternative Connection Methods**
   - Use the web browser version (always works if permissions are correct)
   - Try the GitHub CLI: `gh codespace code`

4. **Get Help**
   - File an issue with:
     - Full error message
     - Steps you've already tried
     - Screenshot of https://github.com/codespaces
     - VS Code version and extension versions
