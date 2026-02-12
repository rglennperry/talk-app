# gordon - Claude Working Instructions

## Project Overview
iPad communication aid for stroke recovery — single-file HTML AAC (Augmentative & Alternative Communication) app for Gordon's mom.

**Context:** Gordon's mother has suffered a stroke and needs help communicating. The app must be simple, high-contrast, touch-friendly, and work entirely offline as a single HTML file opened in Safari on iPad.

## Design Constraints
- **Single HTML file** — all CSS/JS inline, no external dependencies
- **iPad Safari** — must work in landscape and portrait, tested on iPad screen sizes
- **Touch-first** — large tap targets (min 44x44pt, prefer 60px+), no hover states
- **Offline** — no network required after initial load
- **Accessibility** — high contrast, large text, minimal cognitive load
- **Audio** — use Web Speech API (speechSynthesis) for text-to-speech on tap
- **Stroke-appropriate UX** — one-hand operable, forgiving of imprecise taps, no time pressure

## Architecture
- Category-based grid of common phrases/needs
- Categories: Pain, Needs, Feelings, People, Yes/No, Custom
- Each tile: icon/emoji + large text label + tap-to-speak
- Quick-access bar for most urgent: Yes, No, Help, Pain
- Optional: simple keyboard/word prediction for custom messages

## Project Structure

```
gordon/
├── CLAUDE.md           ← You are here
├── STATUS.md           ← Current project state
├── ACTIVITY-JOURNAL.md ← Work session log
├── outputs/            ← Built HTML files
├── docs/               ← Design decisions, research
├── data/               ← Word lists, phrase banks
└── archive/            ← Old/superseded versions
```

## Working Rules

### Before Starting Work
1. Read this file (CLAUDE.md)
2. Read STATUS.md for current state

### When Creating Outputs
- Place HTML builds in `outputs/`
- Use naming: `gordon--{type}--{description}.{ext}`
- Main deliverable: `gordon--app--communicator.html`
- Update STATUS.md if state changes

### When Finishing Work
1. Update ACTIVITY-JOURNAL.md: `| date | source | action | outputs | notes |`
2. Update STATUS.md if project state changed
3. Remind user to commit: `git -C ~/claude-projects/gordon add -A && git -C ~/claude-projects/gordon commit -m "..."`

## Key Files
- `STATUS.md` — Current state
- `ACTIVITY-JOURNAL.md` — Work log
- `outputs/gordon--app--communicator.html` — Main deliverable
