# Cheat Sheet 00 — Git & Terminal Basics
*Phase 0 | Joy Curry & Tandoor Project*
*Format: concept → plain English → syntax → tiny example → Joy Curry example*

---

## Terminal Navigation

**`pwd`** — "Where am I right now?"
```bash
pwd
# Output: /Users/samsid/dev/joy-curry-tandoor
```
Joy Curry: Run this anytime you're lost and need to confirm you're inside the project folder.

---

**`ls`** — "Show me everything in this folder"
```bash
ls
# Output: README.md  backend/  docs/  frontend/  .gitignore
```
Joy Curry: Use after creating new files to confirm they actually appeared.

---

**`cd`** — "Move into a folder" (cd = change directory)
```bash
cd frontend        # move into frontend folder
cd ..              # go up one level (back to parent folder)
cd ~/dev/joy-curry-tandoor   # jump directly to project from anywhere
```
Joy Curry: `cd frontend/js` to navigate to where your JavaScript files live.

---

**`mkdir`** — "Create a new folder" (mkdir = make directory)
```bash
mkdir frontend/js
mkdir -p backend/routes/v1   # -p creates all parent folders too
```
Joy Curry: Used once in setup to create the full project structure.

---

**`touch`** — "Create an empty file"
```bash
touch frontend/js/menu-data.js
```
Joy Curry: Creates `menu-data.js` before you write your first menu item object.

---

**`clear`** or `Cmd + K`** — "Clear the terminal screen"
```bash
clear
```
Joy Curry: Use when the terminal is cluttered after running many commands. Nothing is deleted — it just scrolls the clutter away.

---

**`Ctrl + C`** — "Stop whatever is currently running"
```
Ctrl + C
```
Joy Curry: Essential in Phase 4 when your Node.js server is running and you need to stop it.

---

## Git — The Core Five

**`git clone`** — "Download a repo from GitHub to my machine and link them"
```bash
git clone https://github.com/SayemSiddique/joy-curry-tandoor.git
```
Joy Curry: Used once in Phase 0 to get the repo onto your Mac.

---

**`git status`** — "Show me what has changed since my last save point"
```bash
git status
# Shows: modified files (orange), new untracked files (red), staged files (green)
```
Joy Curry: **Run this constantly.** Before every commit, run `git status` to see exactly what Git sees. No surprises.

---

**`git add`** — "Stage these files — include them in the next save point"
```bash
git add .                        # stage everything that changed
git add frontend/js/menu-data.js # stage one specific file only
```
Joy Curry: After writing your first menu items, `git add frontend/js/menu-data.js` before committing.

---

**`git commit`** — "Create the save point with a message"
```bash
git commit -m "feat: add chicken entrees to menu-data.js (M1.1)"
```
Convention: `type: short description (milestone)`
Types: `feat` (new feature) · `fix` (bug fix) · `docs` (docs/notes) · `chore` (cleanup)
Joy Curry: Every milestone gets its own commit. The message tells future-you exactly what changed.

---

**`git push`** — "Upload my save points to GitHub"
```bash
git push origin main
```
Joy Curry: Run after every commit to keep GitHub in sync with your machine.

---

## Git — The Supporting Cast

**`git pull`** — "Download any changes from GitHub to my machine"
```bash
git pull
```
Joy Curry: Less critical when working solo, essential when working with others.

---

**`git log`** — "Show me the history of all save points"
```bash
git log --oneline
# Output:
# a3f2c1d feat: add chicken entrees to menu-data.js (M1.1)
# 9b12e4a feat: initial repo structure (M0.2)
```
Joy Curry: Run this to see your project's full history. Each line is one commit (save point).

---

**`git diff`** — "Show me exactly what changed in my files since the last save"
```bash
git diff
```
Joy Curry: Before committing, run `git diff` to review every line you changed.

---

## The Commit Workflow (Always in This Order)

```bash
# 1. Check what changed
git status

# 2. Stage your changes
git add .

# 3. Create the save point
git commit -m "feat: what you did (M0.0)"

# 4. Upload to GitHub
git push origin main
```
This sequence is muscle memory by Phase 2. Never skip step 1.

---

## Commit Message Convention

```
feat: add vegan filter to menu (M2.5)
fix: cart total not updating on item remove (M3.4)
docs: add Phase 1 cheat sheet (M1.5)
chore: remove console.logs before commit (M3.5)
```
Rule: present tense, lowercase, under 72 characters, milestone in brackets.

---

## Common Mistakes

**1. Committing without checking status first**
Fix: Always run `git status` before `git add .` — you might stage files you didn't intend to.

**2. Forgetting to push after committing**
Fix: `git commit` saves locally only. `git push` is what gets it to GitHub. Both are needed.

**3. Committing `node_modules/` or `.env`**
Fix: Your `.gitignore` already handles this. But if you ever see these in `git status` as staged, stop immediately and check your `.gitignore`.

**4. Vague commit messages like "update" or "changes"**
Fix: Be specific. "feat: add Chicken Tikka Masala to menu-data.js" tells future-you exactly what happened and when.

**5. Using `cd` with an absolute path when a relative one works**
Fix: Inside the project folder, `cd frontend/js` is cleaner than `cd ~/dev/joy-curry-tandoor/frontend/js`. Save the full path for jumping from outside the project.

---

*Save this file to: `/docs/cheatsheets/00-git-terminal-basics.md` in your repo*
*Then commit: `git add docs/ && git commit -m "docs: add Phase 0 cheat sheet (M0.2)"`*
