# Favorites System — Integration Spec

## Files

- Module: `modules/favorites-system.js`
- Host app: `gordon--app--communicator.html`

## Step 1: Load the module

Add one `<script>` tag **before** the existing `<script>` block (or inline the entire file contents at the top of the existing `<script>`):

```html
<script src="modules/favorites-system.js"></script>
```

Or for a single-file build, paste the contents of `favorites-system.js` at the **top** of the existing `<script>` block, before the `const categories = { ... }` declaration.

## Step 2: Add the Favorites tab

In the `#tabs` div, add a slot where the Favorites tab will be inserted. The module creates the tab dynamically. In the `<script>` section, after `renderGrid();`, add:

```js
// ── Favorites Tab ──
var favTab = FavoritesSystem.createTab(function () {
  FavoritesSystem.renderTab('grid', speak);
});
document.getElementById('tabs').insertBefore(
  favTab,
  document.getElementById('tabs').firstChild
);
```

This inserts the Favorites tab at the **start** of the tab bar so it is always the first (leftmost) tab.

## Step 3: Wire long-press into category grid rendering

Modify `renderGrid()` to attach long-press handlers after rendering tiles. Add a call to `FavoritesSystem.attachToGrid()` at the end of `renderGrid()`:

```js
function renderGrid() {
  const cat = categories[currentCategory];
  const grid = document.getElementById('grid');
  grid.className = 'grid ' + cat.className;

  grid.innerHTML = cat.tiles.map(t =>
    `<div class="tile" onclick="speak('${t.phrase.replace(/'/g, "\\'")}')" role="button" aria-label="${t.phrase}">
      <span class="emoji">${t.emoji}</span>
      <span class="label">${t.label}</span>
    </div>`
  ).join('');

  // NEW: attach long-press-to-favorite on each tile
  FavoritesSystem.attachToGrid('grid', function (tileEl) {
    var label = tileEl.querySelector('.label');
    var emoji = tileEl.querySelector('.emoji');
    var phrase = tileEl.getAttribute('aria-label');
    if (!phrase) return null;
    return {
      phrase: phrase,
      emoji: emoji ? emoji.textContent : '',
      label: label ? label.textContent : phrase
    };
  });
}
```

## Step 4: Fix showCategory to handle favorites

Modify `showCategory()` so that clicking a category tab deactivates the favorites tab too (this already works because `document.querySelectorAll('.tab')` includes the dynamic favorites tab). No change needed.

However, when the Favorites tab is active and the user taps a category tab, `showCategory` is called, which renders the category grid normally. The Favorites tab automatically loses its `active` class. This works correctly with no changes.

## Step 5 (optional): "Save phrase" button

To let users save composed phrases from the message bar, add a star button next to the speak/clear buttons:

```html
<button id="fav-btn" onclick="saveCurrent()" aria-label="Save to favorites">&#9733;</button>
```

Style it like the other message-bar buttons:

```css
#fav-btn {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: white;
  font-size: 1.6rem;
  cursor: pointer;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
```

And the handler:

```js
function saveCurrent() {
  if (!lastPhrase) return;
  var added = FavoritesSystem.savePhrase(lastPhrase);
  if (added) {
    // Toast feedback comes from the module — or add manual:
    // (The module's showToast is internal; replicate or call toggle)
  }
  // Simpler: just use toggle for feedback
  if (FavoritesSystem.isFavorite(lastPhrase)) {
    // already saved above
  }
}
```

A cleaner approach: use the `add`/`toggle` methods directly so you get the star badge updated everywhere.

## Behavior Summary

| Gesture | Context | Result |
|---------|---------|--------|
| Tap tile | Any category | Speaks the phrase |
| Long-press tile (500ms) | Any category grid | Toggles favorite; shows heart animation + toast |
| Tap Favorites tab | Tab bar | Shows grid of all favorites |
| Tap tile | Favorites grid | Speaks the phrase |
| Long-press tile | Favorites grid | Shows "Remove?" confirmation dialog |
| Tap star button | Message bar (optional) | Saves current composed phrase |

## Data

- Stored in `localStorage` under key `gordon-favorites`
- Format: `[{phrase, emoji, label, addedAt}, ...]`
- Survives page reloads and app restarts
- Use `FavoritesSystem.exportJSON()` and `FavoritesSystem.importJSON(json)` for backup/restore

## Theme Compatibility

All CSS uses the existing CSS custom properties (`--bg`, `--surface`, `--card`, `--accent`, `--text`, `--text-dim`, `--radius`, `--danger`, `--success`). The favorites grid uses `.cat-favorites` with a purple-tinted background (`#2c1a3e`) to distinguish it visually from other categories.
