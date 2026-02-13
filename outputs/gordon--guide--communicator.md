# Communicator - Guide for Gordon

## What This Is

A communication app for your mum, built as a single HTML file that runs on her iPad in Safari. No internet needed, no app store, no accounts. She taps a button and the iPad speaks for her.

---

## Getting It On The iPad

Pick whichever is easiest:

1. **AirDrop** the file `gordon--app--communicator-v2.html` from your computer to the iPad
2. **Email** it to yourself, open the email on the iPad, tap the attachment → "Open in Safari"
3. **iCloud Drive** — drop the file in iCloud Drive, open Files app on iPad, tap it

Once it opens in Safari, bookmark it or add it to the Home Screen:
- Tap the **Share** button (square with arrow) → **Add to Home Screen**
- It'll appear as an app icon she can tap to open

---

## How Your Mum Uses It

### Quick Bar (always visible at the top)
Five big buttons always on screen — the essentials:

| Button | Says |
|--------|------|
| 👍 **Aye** | "Aye" |
| 👎 **Naw** | "Naw" |
| 🆘 **Help** | "I need help" |
| 😣 **Pain** | "I'm in pain" |
| 🙏 **Thanks** | "Thank you" |

### Category Tabs
Below the quick bar are tabs for different needs. She taps a tab, then taps any tile in the grid:

| Tab | What's in it |
|-----|-------------|
| 🍽 **Needs** | Water, hungry, bathroom, medicine, glasses, phone, temperature, TV, lights |
| 🩹 **Pain** | Head, chest, stomach, legs, back, arm, severity (a lot / a little / worse / better), nausea |
| 💙 **Feelings** | Happy, sad, worried, frustrated, tired, scared, loved, lonely, angry, calm, bored |
| 👤 **People** | Nurse, doctor, family, Gordon (you!), visitor, company, alone time, phone call |
| ✋ **Actions** | Lie down, sit up, walk, turn over, wash, change clothes, teeth, eat, stop, wait |
| 🛋 **Comfort** | Pillow, ice, cup of tea, straw, music, window, door, tissue, lotion, fresh air, hug |
| ★ **Favourites** | Her saved favourites (see below) |

### Message Bar
Shows what was last spoken. Two buttons on the right:
- 🔊 **Replay** — says it again
- ✕ **Clear** — clears the display

### Recent Requests
A scrollable row appears showing her last 10 requests. She can tap any to re-speak it. Useful when she needs the same thing repeatedly (like water).

### Favourites
**To save a favourite:** press and hold any tile for half a second. A heart animation confirms it's saved.

**To use favourites:** tap the ★ Favourites tab.

**To remove a favourite:** long-press a tile in the Favourites tab, then confirm removal.

---

## How You (Gordon) Customise It

### Admin Panel
Tap the `⚙ Admin` button in the top-right corner. This opens a full settings panel with four sections:

#### Categories
- Add new categories (e.g. "Meals", "Telly", "Garden")
- Rename, reorder, or delete existing ones
- Change the emoji icon and tile colour for each category

#### Tiles (within a category)
- Tap the grid icon next to any category to see its tiles
- Add new tiles — set the emoji, label, and spoken phrase
- Add image tiles — paste a base64 image URL (for photos of family, places, etc.)
- Edit any tile's emoji, label, or phrase
- Reorder or delete tiles

#### Quick Add Phrase
- Fast way to add a new phrase: pick an emoji, type a label and phrase, choose which category

#### Import / Export / Reset
- **Export**: saves all customisations as JSON text — copy it and keep it somewhere safe
- **Import**: paste in a JSON config to restore or transfer to another device
- **Reset**: wipe all customisations and go back to the original defaults

### Tips for Customising
- Start with the defaults, then adjust based on what your mum actually uses
- Remove tiles she'll never need (less clutter = easier to find things)
- Add people by name — her friends, neighbours, carers
- The phrases use gentle Scots English — tweak any that don't sound like her
- Pain/medical phrases are in standard English so all carers understand them

---

## The Scottish Voice

The app tries to use **Fiona**, Apple's Scottish English voice. If she's not already on the iPad:

1. Go to **Settings** → **Accessibility** → **Spoken Content** → **Voices**
2. Tap **English (UK)** or **English (United Kingdom)**
3. Find **Fiona** and tap the download button
4. Once downloaded, the app will use her automatically

If Fiona isn't available, it falls back to the best available British English voice.

---

## Everything Stays on the iPad

- No internet connection needed after the initial load
- All data (recents, favourites, admin changes) saved in the iPad's browser storage
- Nothing is sent anywhere — complete privacy
- **Important**: if Safari's data is cleared (Settings → Safari → Clear History and Website Data), customisations will be lost. Use the Export feature in Admin to back up regularly.

---

## Getting Updates

When we make improvements to the app, you'll get a new HTML file. To update:

1. Open the new file on the iPad
2. If your mum has customisations, open Admin → Export first on the old version, save the JSON
3. Open the new version, go to Admin → Import, paste the JSON
4. Her favourites and recents are separate and will persist automatically

---

## Need Changes?

Tell me what your mum needs and I'll update the app:
- Different phrases or categories
- Bigger or smaller tiles
- Light background instead of dark
- Photo tiles of family members
- Anything else — this is her app, it should work for her
