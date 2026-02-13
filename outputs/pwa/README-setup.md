# Talk PWA - Setup & Deployment Guide

## What This Is

A Progressive Web App (PWA) version of the Talk communicator app. When hosted on any HTTPS web server, it can be installed on an iPad as a home screen app that works fully offline.

## Files Included

| File | Purpose |
|------|---------|
| `index.html` | The full communicator app (self-contained) |
| `manifest.json` | PWA manifest (name, icons, display mode) |
| `sw.js` | Service worker (caches files for offline use) |
| `icon-192.png` | App icon (192x192) |
| `icon-512.png` | App icon (512x512) |

---

## Hosting Option 1: GitHub Pages (Free)

1. **Create a GitHub account** at https://github.com if you don't have one
2. **Create a new repository:**
   - Click the "+" button, then "New repository"
   - Name it something like `talk-app`
   - Make it **Public** (required for free GitHub Pages)
   - Click "Create repository"
3. **Upload the files:**
   - Click "uploading an existing file"
   - Drag all 5 files from this `pwa/` folder into the upload area
   - Click "Commit changes"
4. **Enable GitHub Pages:**
   - Go to the repository's **Settings** tab
   - Click **Pages** in the left sidebar
   - Under "Source", select **main** branch and **/ (root)** folder
   - Click **Save**
5. **Your app URL** will be: `https://YOUR-USERNAME.github.io/talk-app/`
   - It may take 1-2 minutes to go live

## Hosting Option 2: Netlify (Free, Drag-and-Drop)

1. Go to https://app.netlify.com/drop
2. Drag the entire `pwa/` folder onto the page
3. Your site will be live instantly with a random URL like `https://random-name-12345.netlify.app`
4. Optionally rename it in site settings to something like `gordon-talk.netlify.app`

## Hosting Option 3: Any Web Server

Copy the 5 files to any web server directory. The server MUST serve over HTTPS for the service worker and Web Speech API to function.

---

## Installing on iPad

1. **Open Safari** on the iPad (must be Safari, not Chrome or Firefox)
2. **Navigate to the app URL** (e.g. `https://YOUR-USERNAME.github.io/talk-app/`)
3. **Wait for the page to fully load** (you should see the communicator app)
4. **Tap the Share button** (the square with an arrow pointing up, at the top of Safari)
5. **Scroll down and tap "Add to Home Screen"**
6. **Name it "Talk"** (or whatever you prefer) and tap **Add**
7. **The app icon will appear on the home screen** -- tap it to launch
8. The app will open in full-screen mode (no Safari browser bars)

### After Installation

- The app works fully offline once installed
- All data (recents, favourites, admin customisations) is stored locally on the iPad
- No internet connection is needed for day-to-day use

---

## Updating the App

When you want to update the app with new features or changes:

1. **Replace `index.html`** in your hosting repository/server with the new version
2. **Push/upload the change** (e.g. commit to GitHub, re-deploy on Netlify)
3. **Users get the update on next open:**
   - The service worker checks for updates when the app opens while online
   - The new version will be available on the *next* launch after the update is detected
   - To force an immediate update: close the app completely, then reopen it twice

### Updating the Service Worker Version

If you make significant changes, update the cache version in `sw.js`:

```js
const CACHE = 'talk-v3';  // Change from v2 to v3
```

This forces the service worker to re-download all cached files.

---

## Important Notes

### HTTPS Required

The Web Speech API (text-to-speech) requires HTTPS to work. Both GitHub Pages and Netlify provide HTTPS automatically. If you self-host, you need an SSL certificate.

### Speech Synthesis on iPad

- iOS Safari has excellent built-in text-to-speech voices
- The app prefers Scottish English voices when available
- The first time you tap a button, iOS may require a user gesture to activate audio -- this is handled automatically

### Data Storage

- All user data (recents, favourites, admin config) is stored in the browser's `localStorage`
- This data stays on the device and is NOT synced between devices
- If the user clears Safari's website data, the customisations will be lost
- Use the Admin Panel's Export feature to back up customisations

### Troubleshooting

| Problem | Solution |
|---------|----------|
| "Add to Home Screen" not showing | Must use Safari (not Chrome/Firefox). Make sure the manifest.json is loading correctly. |
| App not working offline | Open the app once while online to let the service worker cache the files. |
| No sound when tapping buttons | Tap any button once -- iOS requires a user gesture to enable audio. Check the iPad is not on silent/muted. |
| Old version still showing | Close the app completely (swipe up from app switcher), reopen it while online, close again, reopen. |
