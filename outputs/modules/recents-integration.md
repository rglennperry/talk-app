# RecentsEngine Integration Spec

How to wire `recents-engine.js` into `gordon--app--communicator.html`.

## 1. Add the recents container element

Insert a `<div>` immediately **after** the `#message-bar` and **before** `#tabs`:

```html
  <!-- Recent Requests Bar -->
  <div id="recents-container"></div>

  <!-- Category Tabs -->
  <div id="tabs">
```

## 2. Inline the script

Paste the entire contents of `recents-engine.js` inside a `<script>` tag **before** the existing `<script>` block (or at the very top of the existing `<script>` block, before any code that calls `speak()`).

```html
<script>
// ── RecentsEngine module ──
var RecentsEngine = (function () {
  // ... full module contents ...
})();
</script>

<script>
// ── existing app code ──
```

Alternatively, paste it at the top of the single existing `<script>` block.

## 3. Hook into the `speak()` function

In the existing `speak()` function, add a `RecentsEngine.add()` call. The challenge is knowing which emoji and category to pass. Two approaches:

### Approach A: Pass emoji/category through speak()

Modify the `speak` function signature and all callers:

```js
function speak(phrase, emoji, category) {
  // ... existing speak logic ...

  // Track in recents (add this near the end, before the flash)
  if (typeof RecentsEngine !== 'undefined') {
    RecentsEngine.add(phrase, emoji || '', category || '');
  }
}
```

Then update tile `onclick` handlers in `renderGrid()`:

```js
grid.innerHTML = cat.tiles.map(t =>
  `<div class="tile" onclick="speak('${t.phrase.replace(/'/g, "\\'")}', '${t.emoji}', '${currentCategory}')" ...>`
).join('');
```

And the quickbar tiles:

```html
<div class="tile qb-yes" onclick="speak('Yes', '👍', 'quick')" ...>
```

### Approach B: Simpler — look up emoji from phrase (less work)

Add a reverse lookup and just call `RecentsEngine.add(phrase)` with auto-detected emoji:

```js
function speak(phrase) {
  // ... existing speak logic ...

  // Auto-detect emoji and category for recents tracking
  if (typeof RecentsEngine !== 'undefined') {
    var found = _findTileByPhrase(phrase);
    RecentsEngine.add(phrase, found ? found.emoji : '', found ? found.category : '');
  }
}

function _findTileByPhrase(phrase) {
  for (var cat in categories) {
    var tiles = categories[cat].tiles;
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i].phrase === phrase) {
        return { emoji: tiles[i].emoji, category: cat };
      }
    }
  }
  // Check quickbar
  var qb = { 'Yes': '👍', 'No': '👎', 'I need help': '🆘', 'I am in pain': '😣', 'Thank you': '🙏' };
  if (qb[phrase]) return { emoji: qb[phrase], category: 'quick' };
  return null;
}
```

**Recommendation:** Approach B is less invasive — no need to change any existing onclick attributes.

## 4. Initialize the bar

At the bottom of the `<script>` block, after `renderGrid()`:

```js
renderGrid();

// Initialize recents bar
RecentsEngine.renderBar('recents-container');
```

## 5. Summary of changes

| What | Where | Action |
|------|-------|--------|
| Container div | After `#message-bar`, before `#tabs` | Add `<div id="recents-container"></div>` |
| Module script | Top of `<script>` or separate `<script>` before app code | Paste full `recents-engine.js` contents |
| speak() hook | Inside existing `speak()` function | Add `RecentsEngine.add(...)` call |
| Lookup helper | Anywhere in app script | Add `_findTileByPhrase()` if using Approach B |
| Init call | After `renderGrid()` | Add `RecentsEngine.renderBar('recents-container')` |

## 6. Verification

After integration, test:

1. Tap any tile — it should appear in the recents bar
2. Tap the same tile again — it should move to the front, not duplicate
3. Tap a recents tile — it should re-speak the phrase
4. Reload the page — recents should persist
5. Tap the X button on the recents bar — history clears
6. Verify the bar is hidden when empty (before any phrases are spoken)
