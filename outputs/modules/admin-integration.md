# Admin Panel Integration Spec

## Overview

`admin-panel.js` is a self-contained module that adds a full admin/customization panel to the Gordon AAC Communicator. It exposes a global `AdminPanel` object. All CSS is injected programmatically — no additional stylesheets needed.

## How to Wire It In

### Step 1: Include the Script

Add this line before the closing `</body>` tag, **after** the existing `<script>` block:

```html
<script src="modules/admin-panel.js"></script>
```

Or, for a fully inlined single-file build, paste the entire contents of `admin-panel.js` into a new `<script>` block after the existing one.

### Step 2: Make `categories` Mutable

The existing app declares categories as `const`. Change to `let` so the admin panel can modify the reference contents:

```js
// Before:
const categories = { ... };

// After:
let categories = { ... };
```

> Note: The admin panel modifies the object in-place (deletes/adds keys, mutates `.tiles` arrays), so a `let` declaration is sufficient — the variable itself isn't reassigned, but `const` plus in-place mutation also works. The `let` is a precaution.

### Step 3: Initialize the Admin Panel

At the bottom of the existing `<script>` block (after `renderGrid()` is called), add:

```js
// Initialize admin panel — pass the live categories and the render function
AdminPanel.init(categories, renderGrid);
```

### Step 4: Update `renderGrid` for Dynamic Categories

The current `renderGrid` uses a hardcoded `showCategory('needs')` default tabs and hardcoded tab HTML. For full dynamic support, the tabs need to be rendered from the `categories` object. Minimal change:

#### 4a. Make `renderGrid` also rebuild tabs

Replace the static tabs HTML in the `<div id="tabs">` section with an empty container:

```html
<div id="tabs"></div>
```

#### 4b. Add a `renderTabs` function

```js
function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  const keys = Object.keys(categories);

  // If current category no longer exists, default to first
  if (!categories[currentCategory]) {
    currentCategory = keys[0] || 'needs';
  }

  tabsEl.innerHTML = keys.map(key => {
    const cat = categories[key];
    const name = cat.name || (key.charAt(0).toUpperCase() + key.slice(1));
    const emoji = cat.emoji || (cat.tiles && cat.tiles[0] ? cat.tiles[0].emoji : '');
    const active = key === currentCategory ? ' active' : '';
    return `<div class="tab${active}" onclick="showCategory('${key}')">${emoji} ${name}</div>`;
  }).join('');
}
```

#### 4c. Update `showCategory` to not depend on `event.currentTarget`

```js
function showCategory(name) {
  currentCategory = name;
  renderTabs();
  renderGrid();
}
```

#### 4d. Update `renderGrid` to call `renderTabs`

```js
function renderGrid() {
  const cat = categories[currentCategory];
  if (!cat) return;
  const grid = document.getElementById('grid');
  grid.className = 'grid ' + (cat.className || '');

  grid.innerHTML = cat.tiles.map(t => {
    const visual = t.image
      ? `<img src="${t.image}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;">`
      : `<span class="emoji">${t.emoji}</span>`;
    return `<div class="tile" onclick="speak('${t.phrase.replace(/'/g, "\\'")}')" role="button" aria-label="${t.phrase}">
      ${visual}
      <span class="label">${t.label}</span>
    </div>`;
  }).join('');

  renderTabs();
}
```

### Step 5: Generate Dynamic Category CSS

Custom categories may use `className` values like `cat-custom1` that don't have CSS rules. The admin panel sets `className` from a predefined set, but the tile background color for grid view comes from CSS like `.cat-needs .tile { background: #1a5276; }`.

Add a helper that generates these rules dynamically:

```js
function updateCategoryStyles() {
  let styleEl = document.getElementById('dynamic-cat-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-cat-styles';
    document.head.appendChild(styleEl);
  }
  const colorMap = {
    'cat-needs': '#1a5276', 'cat-pain': '#7b241c', 'cat-feelings': '#1e8449',
    'cat-people': '#6c3483', 'cat-actions': '#b9770e', 'cat-comfort': '#117a65',
    'cat-custom1': '#1b2631', 'cat-custom2': '#6e2c00',
    'cat-custom3': '#2c3e50', 'cat-custom4': '#0b5345',
  };
  let css = '';
  for (const [cls, bg] of Object.entries(colorMap)) {
    css += `.${cls} .tile { background: ${bg}; }\n`;
  }
  styleEl.textContent = css;
}
```

Call `updateCategoryStyles()` once at init.

## Data Flow (Before vs. After)

### Before (hardcoded)

```
Page Load
  -> const categories = { needs: {...}, pain: {...}, ... }
  -> renderGrid() reads from categories
  -> showCategory() switches currentCategory, calls renderGrid()
```

### After (dynamic)

```
Page Load
  -> let categories = { needs: {...}, pain: {...}, ... }  // defaults
  -> AdminPanel.init(categories, renderGrid)
     |-> Checks localStorage('gordon-config')
     |-> If found: replaces contents of categories object in-place
     |-> If not found: leaves defaults intact
     |-> Snapshots defaults internally for reset
     |-> Injects CSS, gear icon, triple-tap listener
  -> renderGrid() / renderTabs() reads from categories (now possibly customized)

Admin Edit Flow:
  -> User taps gear icon (or triple-taps header area)
  -> AdminPanel.open() -> overlay slides in
  -> User edits categories/tiles
  -> Each edit: mutates categories in-place, calls saveConfig() + renderGrid()
  -> AdminPanel.close() -> overlay slides out, final renderGrid()

Import/Export Flow:
  -> Export: AdminPanel.exportConfig() -> JSON.stringify(categories)
  -> Import: AdminPanel.importConfig(json) -> validates, replaces categories in-place, saves
  -> Reset: AdminPanel.resetToDefaults() -> restores snapshotted defaults, clears localStorage
```

## localStorage Schema

Key: `gordon-config`

Value: JSON object matching the categories structure:

```json
{
  "needs": {
    "name": "Needs",
    "emoji": "🍽",
    "className": "cat-needs",
    "tiles": [
      { "emoji": "💧", "label": "Water", "phrase": "I need water" },
      { "emoji": "🖼", "label": "Photo", "phrase": "This is my photo", "image": "data:image/png;base64,..." }
    ]
  }
}
```

Properties added by admin panel (not present in original hardcoded data):
- `name` — display name for the category (original used the object key)
- `emoji` — category tab emoji (original derived from first tile)
- `image` — optional base64 data URL on tiles (for image tiles)

## Entry Points

| Gesture | Target | Action |
|---------|--------|--------|
| Single tap | Gear icon (top-right corner, subtle) | Opens admin panel |
| Triple tap | Quick bar / header area | Opens admin panel |

## API Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `AdminPanel.init(categories, renderGrid)` | void | Initialize; pass live categories object and re-render callback |
| `AdminPanel.open()` | void | Slide in admin overlay |
| `AdminPanel.close()` | void | Slide out overlay, re-render main app |
| `AdminPanel.exportConfig()` | string | JSON of current categories |
| `AdminPanel.importConfig(json)` | void | Parse and apply JSON; throws on invalid input |
| `AdminPanel.resetToDefaults()` | void | Restore original categories, clear localStorage |
| `AdminPanel.getCategories()` | object | Returns saved config or defaults (deep clone) |
