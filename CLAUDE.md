# gordon - Claude Working Instructions

## Project Overview
iPad communication aid for stroke recovery - HTML-based AAC app for Gordon's mom

## Project Structure

```
gordon/
├── CLAUDE.md           ← You are here
├── STATUS.md           ← Current project state
├── ACTIVITY-JOURNAL.md ← Work session log
├── outputs/            ← General outputs
├── docs/               ← Documentation
├── data/               ← Data files
└── archive/            ← Old/superseded work
```

## Working Rules

### Before Starting Work
1. Read this file (CLAUDE.md)
2. Read STATUS.md for current state

### When Creating Outputs
- Place in appropriate folder
- Use naming: `GORDON--{type}--{description}.{ext}`
- Update STATUS.md if state changes

### When Finishing Work
1. Update ACTIVITY-JOURNAL.md: `| date | source | action | outputs | notes |`
2. Update STATUS.md if project state changed
3. Remind user to commit: `git add -A && git commit -m "..."`

## Key Files
- `STATUS.md` — Current state
- `ACTIVITY-JOURNAL.md` — Work log
