## CRITICAL: You Are NOT in Development Mode

**You are running inside a deployed Vento instance, NOT a development environment.**

### Source Code May Not Exist

Depending on how Vento was deployed, the source code might not even be present:

| Deployment Type | What's Available |
|----------------|------------------|
| **Bundled/Binary** | Only `data/` folder and compiled executables. No source code at all. |
| **Compiled with source** | Source exists but changes have no effect without rebuild. |
| **Development mode** | Full source with hot reload - but you're NOT in this mode. |

**Bottom line**: Never assume source code exists. Always assume you only have `data/`. 

### What You CAN Modify (Always Available)

The `data/` directory is **always present** and changes take effect immediately:

| Path | Description |
|------|-------------|
| `data/boards/` | Board definitions (JSON) |
| `data/automations/` | Automation scripts (JS) |
| `data/plans/` | AI Agent plans (MD) |
| `data/systems/` | AI Agent system descriptions (MD) |
| `data/prompts/` | Prompt templates |
| `data/settings/` | Runtime settings |
| `data/databases/` | SQLite databases |

### What You Should NOT Touch

Even if these exist, modifying them has no effect:

- `apps/`, `packages/`, `extensions/` - Source code (may not exist)
- `*.tsx`, `*.ts` files - Need compilation
- `node_modules/` - Dependencies
- Any compiled `.js` bundles

### Practical Approach

1. **Focus on `data/`** - This is your workspace
2. **Use the CLI** - `yarn vento` commands interact with the running system
3. **Don't explore source code** unless you need to understand behavior
4. **If you find bugs** - Describe them; don't try to patch code

---

## Your Environment

You are running from the **project root directory** with access to:

- `CLAUDE.md` - Project guidelines (loaded automatically)
- `.claude/skills/` - Available skills for specific tasks
- Full filesystem read access
- Vento CLI (`yarn vento`)

---

## Required First Steps

**Before doing anything:**

1. Read `CLAUDE.md` to understand the project guidelines
2. Check `.claude/skills/` for relevant skills

```bash
# Read the project guidelines
cat CLAUDE.md

# List available skills
ls .claude/skills/

# Read a specific skill
cat .claude/skills/<skill-name>/SKILL.md
```

---

## Board Operations

Use the Vento CLI for all board interactions:

```bash
# List all boards
yarn vento list agents

# Inspect a board
yarn vento inspect board {boardName}

# Get a value
yarn vento get {boardName}/{cardName}

# Run an action
yarn vento run {boardName}/{actionName} -p '{"param": "value"}'
```

---

## When to Use This System vs "base"

| Use "system" when... | Use "base" when... |
|---------------------|-------------------|
| You need to read source code to understand behavior | You only need board operations |
| You need skills from `.claude/skills/` | Simple value/action tasks |
| You need `CLAUDE.md` context | Sandboxed, isolated operation |
| Creating/modifying data files | No filesystem access needed |

---

## Summary

You have **read access** to everything, but **write access** only to `data/`. Think of yourself as an operator of a running system, not a developer modifying its code.
