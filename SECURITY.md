# Security Guidelines

This document outlines the security practices for the Trail Current project.

## 🔐 Pre-Commit Hook

A pre-commit hook is installed to automatically check for common security issues before commits are created.

### What's Protected

The hook prevents accidentally committing:
- **Secrets:** Passwords, API keys, tokens
- **Credentials:** AWS, Google Cloud, Firebase keys
- **Private Keys:** .key, .pem, .cer files
- **Environment Files:** .env with real secrets
- **Configuration:** Hardcoded IP addresses and usernames

### How It Works

When you run `git commit`:

1. ✅ **PASS** → Commit proceeds (green checkmark)
2. ⚠️ **WARNINGS** → Commit proceeds but shows warnings (yellow)
3. ❌ **ERRORS** → Commit is blocked (red), fix required

### Example: Protected Files

**Automatically Blocked:**
```
❌ .env (with real secrets)
❌ data/keys/private.key (outside .gitignore)
❌ .pem, .cer, .pfx files
```

**Always Allowed:**
```
✅ .env.example (with placeholder values)
✅ data/keys/ files (in .gitignore)
✅ Code with function params named "password"
```

## 📝 Secret Management

### Store Secrets Here

**Development:**
- Copy `.env.example` to `.env`
- Edit `.env` with your real values
- `.env` is in `.gitignore` (never committed)

**Example `.env` File:**
```bash
# .env (local only, never commit)
MQTT_PASSWORD=myRealPassword123
NODE_RED_ADMIN_PASSWORD=myAdminPass
NODE_RED_CREDENTIAL_SECRET=abc123def456...
DATABASE_URL=postgresql://user:pass@localhost/db
```

**Reference:**
- `.env.example` in repo (with placeholders)
- Others copy it and fill in real values
- Only `.env` files are excluded from git

### Never Do This

```bash
# ❌ DON'T: Hardcode secrets in code
const PASSWORD = "myPassword123";
const API_KEY = "sk-1234567890abcdef";

# ❌ DON'T: Commit .env file
git add .env  # This will be blocked

# ❌ DON'T: Put secrets in comments
# admin password is: password123

# ❌ DON'T: Store credentials in config files
database:
  password: "actualPassword"
```

### Always Do This

```bash
# ✅ DO: Use environment variables
const password = process.env.MQTT_PASSWORD;
const apiKey = process.env.API_KEY;

# ✅ DO: Store in .env (local file)
# .env is in .gitignore

# ✅ DO: Use .env.example for reference
# .env.example has YOUR_VALUE_HERE

# ✅ DO: Check .gitignore is configured
# Verify: grep "\.env" .gitignore
```

## 🚨 If You Accidentally Commit a Secret

**Immediate Actions:**
1. Remove the secret from your codebase
2. Generate a new secret/token (invalidate the old one)
3. Force-push to remove from history (if private repo)
4. Report to the security team

**Example:**
```bash
# Remove file from last commit
git reset --soft HEAD~1
git restore --staged <file>
git restore <file>  # Get clean version from origin

# OR: Remove specific content from last commit
git commit --amend  # Edit and remove secret
git push --force-with-lease  # Only if private repo
```

## 🔍 Security Checklist

Before pushing to GitHub:

- [ ] No `.env` files in commit (only `.env.example`)
- [ ] No hardcoded passwords or API keys
- [ ] No private key files (.key, .pem, .cer, .crt)
- [ ] No AWS credentials (AKIA...)
- [ ] No Firebase/Google Cloud keys (AIza...)
- [ ] No suspicious public IP addresses
- [ ] `.gitignore` properly configured
- [ ] Pre-commit hook passed all checks

## 📚 Documentation

For detailed pre-commit hook information:
- See: `.git/hooks/README.md`
- Examples of what passes/fails
- Troubleshooting guide
- Configuration instructions

## 🛠️ For Developers

### First Time Setup

```bash
# Hook is already installed (no action needed)
# It runs automatically on git commit

# If you need to reinstall:
chmod +x .git/hooks/pre-commit
```

### Testing the Hook

```bash
# Test that hook is working
echo 'password = "secret"' > test.txt
git add test.txt
git commit -m "test"  # Should be blocked

# Clean up
git restore --staged test.txt
rm test.txt
```

### If Hook Blocks Your Commit

```bash
# 1. Check what was flagged
git diff --cached

# 2. Fix the issue (remove secret, etc.)
# 3. Stage again
git add <file>
git commit -m "Your message"

# Only if absolutely sure it's a false positive:
git commit --no-verify
```

## 📋 Resources

- [OWASP: Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Git: Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)

## ❓ Questions?

If you're unsure whether something should be committed:
1. Check `.git/hooks/README.md` for examples
2. Ask the security team
3. When in doubt, don't commit it

---

**Remember:** The pre-commit hook is there to help keep the project secure. Always respect what it's trying to prevent! 🔐
