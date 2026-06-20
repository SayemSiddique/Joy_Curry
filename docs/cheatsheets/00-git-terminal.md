# Cheat Sheet 00 — Git & Terminal Basics

> Reference for Phase 0 of the Joy Curry & Tandoor build.

---

## Terminal Navigation

**`pwd`** — Print Working Directory — tells you where you are right now.
```bash
pwd                  # /Users/sam/Zcode/Joy Curry Project/joy-curry-tandoor
```

**`ls`** — List files in the current directory.
```bash
ls                   # shows files
ls -la               # shows hidden files + sizes + permissions
```

**`cd`** — Change Directory — move between folders.
```bash
cd backend           # go into backend/
cd ..                # go up one level
cd ~/Zcode           # jump to absolute path
```

**`mkdir`** — Make a new directory.
```bash
mkdir docs/cheatsheets
```

**`touch`** — Create an empty file.
```bash
touch backend/.env
```

---

## Git Core Workflow

**`git init`** — Initialise a new repo in the current folder.
```bash
git init
```

**`git status`** — Show what's changed, staged, or untracked.
```bash
git status
```

**`git add`** — Stage file(s) for the next commit.
```bash
git add frontend/js/app.js       # specific file
git add frontend/                # entire folder
```

**`git commit`** — Save a snapshot of staged changes.
```bash
git commit -m "feat(menu): render cards with allergen badges (M3.3)"
```
Joy Curry commit format: `type(scope): description (Mx.x)`

**`git push`** — Upload commits to GitHub.
```bash
git push origin main
```

**`git pull`** — Download and merge remote changes.
```bash
git pull origin main
```

---

## Branching

**`git branch`** — List, create, or delete branches.
```bash
git branch                  # list local branches
git branch feature/auth     # create new branch
```

**`git checkout`** — Switch branches or restore files.
```bash
git checkout main
git checkout -b feature/auth    # create + switch in one step
```

**`git merge`** — Merge a branch into the current one.
```bash
git checkout main
git merge feature/auth
```

---

## Remote & History

**`git remote -v`** — Show configured remotes.
```bash
git remote -v
# origin  https://github.com/SayemSiddique/joy-curry-tandoor (fetch)
```

**`git log --oneline`** — Compact commit history.
```bash
git log --oneline -10
# a3f2d1b feat(orders): BundleModal, checkout→confirmation (M7.2)
```

**`git diff`** — Show unstaged changes line-by-line.
```bash
git diff frontend/js/app.js
```

---

## .gitignore

Tells Git which files to never track.

```
node_modules/
.env
*.db
*.db-shm
*.db-wal
```

Joy Curry uses this to keep `joy-curry.db` and `JWT_SECRET` out of the repo.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Committed `node_modules/` | Add `node_modules/` to `.gitignore`, run `git rm -r --cached node_modules/` then commit |
| Committed `.env` with secrets | Run `git rm --cached .env`, add to `.gitignore`, rotate the exposed secrets immediately |
| Wrong commit message (not pushed yet) | `git commit --amend -m "corrected message"` — only safe before push |
| Pushed to `main` by mistake | Create a PR and revert; never force-push `main` |
| Merge conflict in `package-lock.json` | Accept one version, then run `npm install` to regenerate |
