# gordon - Status

**Last Updated:** 2026-02-12
**Current Focus:** v2 ready for iPad testing

## Overview
iPad communication aid for stroke recovery — single-file HTML AAC app for Gordon's mom (southern Scotland).

## Current State
- [x] Project scaffolded
- [x] v1 communicator app — category grid + tap-to-speak + voice synthesis
- [x] v2 — recents, favorites, admin panel, Scots dialect
- [ ] Test on iPad Safari
- [ ] Personalize phrases for Gordon's mom

## v2 Features
- **Recents bar**: last 10 spoken phrases, persistent, one-tap replay
- **Favorites**: long-press any tile to save, ★ Favourites tab, persists in localStorage
- **Admin panel**: gear icon → Gordon can add/edit/remove categories, tiles, images; import/export JSON config; reset to defaults
- **Scots dialect**: gentle Scottish English defaults (Aye/Naw, cauld, puggled, braw, wee cup of tea); medical phrases kept standard
- **Speech**: en-GB voice preference
- **Single file**: ~87KB, zero dependencies, fully offline

## Design Decisions
- Single HTML file, no dependencies (offline iPad use)
- Web Speech API for text-to-speech (en-GB)
- Large touch targets, high contrast, one-hand operable
- Category-based phrase grid with quick-access bar
- localStorage for all persistence (recents, favorites, admin config)
- Gentle Scots English — not broad Scots, must be understood by all carers

## Recent Activity
- 2026-02-12: Project created and tailored for AAC communicator
- 2026-02-12: v1 communicator built — 6 categories, 69 phrases, speech synthesis
- 2026-02-12: v2 built — 3 parallel agents (recents, favorites, admin) + integrator agent

## Next Actions
- [ ] Test on iPad Safari — speech synthesis, touch, offline
- [ ] Gordon reviews Scots phrasing with his mum
- [ ] Personalize: mum's name, family names, specific preferences via admin panel
- [ ] Consider: photo tiles of family members, familiar places
