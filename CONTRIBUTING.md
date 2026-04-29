# Contributing to Green Freight Academy

This document describes the version control workflow for this repository.

---

## Golden Rules

1. **Never push directly to `main`** — all changes go through a branch and Pull Request.
2. **Never commit `.env.local`** — it is in `.gitignore` for a reason. Secrets stay local.
3. **Never commit `node_modules/` or `.next/`** — these are build artefacts, not source code.
4. **One feature per branch** — keep branches focused and small for easy review.
5. **Write clear commit messages** — future you (and Asif) will thank you.

---

## Branch Naming

| Type | Pattern | Example |
| :--- | :--- | :--- |
| New feature | `feature/short-description` | `feature/tco-export-pdf` |
| Bug fix | `fix/short-description` | `fix/contact-form-validation` |
| Content update | `content/short-description` | `content/update-homepage-hero` |
| Hotfix (urgent) | `hotfix/short-description` | `hotfix/admin-login-broken` |

---

## Workflow

```bash
# 1. Always start from an up-to-date main
git checkout main
git pull origin main

# 2. Create your branch
git checkout -b feature/your-feature-name

# 3. Make your changes, then stage and commit
git add .
git commit -m "feat: describe what changed and why"

# 4. Push your branch to GitHub
git push origin feature/your-feature-name

# 5. Open a Pull Request on GitHub
# Go to https://github.com/Abdool11/greenfreightacademy
# Click "Compare & pull request"
# Fill in the PR template
# Request review from Asif

# 6. After approval, merge to main on GitHub
# Delete the branch after merging
```

---

## Commit Message Format

```
type: short summary (present tense, max 72 chars)

Optional body explaining what changed and why.
```

Types: `feat`, `fix`, `content`, `chore`, `hotfix`

---

## Resolving Conflicts

If GitHub shows a conflict when you open a PR:

```bash
git checkout main
git pull origin main
git checkout feature/your-feature-name
git merge main
# Resolve conflicts in your editor
git add .
git commit -m "chore: resolve merge conflicts with main"
git push origin feature/your-feature-name
```

The PR will update automatically and the conflict will be resolved.
