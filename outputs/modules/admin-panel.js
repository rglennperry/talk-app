/**
 * AdminPanel — Admin/Customization Panel for Gordon AAC Communicator
 *
 * Self-contained module: includes all CSS, HTML generation, and logic.
 * Provides caregiver (Gordon) with full control over categories, tiles,
 * phrases, images, import/export, and factory reset.
 *
 * API:
 *   AdminPanel.init(categoriesRef, renderGridFn)
 *   AdminPanel.open() / AdminPanel.close()
 *   AdminPanel.exportConfig() -> JSON string
 *   AdminPanel.importConfig(jsonString)
 *   AdminPanel.resetToDefaults()
 *   AdminPanel.getCategories() -> categories object (custom or defaults)
 *
 * Storage key: 'gordon-config'
 */
const AdminPanel = (function () {
  'use strict';

  // ── State ──
  let _defaultCategories = null; // snapshot of original hardcoded categories
  let _categories = null;        // live reference used by the main app
  let _renderGrid = null;        // callback to re-render main app grid
  let _isOpen = false;
  let _currentSection = 'categories'; // categories | tiles | phrases | images | transfer
  let _selectedCategory = null;       // key of category being edited
  let _panelEl = null;
  let _styleEl = null;
  let _gearEl = null;

  // ── localStorage key ──
  const STORAGE_KEY = 'gordon-config';

  // ── Admin accent color ──
  const ADMIN_ACCENT = '#8e44ad';
  const ADMIN_ACCENT_LIGHT = '#a569bd';

  // ── Emoji Picker Data (~120 emojis organized by type) ──
  const EMOJI_GROUPS = {
    'Faces': ['😊','😢','😟','😠','😴','😰','🥰','😔','😤','😌','🥱','🤗','😣','😕','🤢','🥵','🤕','😮‍💨'],
    'Hands & Body': ['👍','👎','👋','🤝','🙏','✋','💪','🦵','🦴','👁','👂','🫁','🧠','❤️','🫀'],
    'People': ['👩‍⚕️','🧑‍⚕️','👨‍👩‍👧','👦','👧','👩','👨','🧓','👴','👵','🙋','🧑‍🤝‍🧑','👤'],
    'Medical': ['💊','🩹','🩺','🩼','🏥','🧪','💉','🌡','🩻','♿','🚑'],
    'Objects': ['💧','📱','👓','📺','📻','📞','🔇','💡','🪑','🛏','🚪','🪟','📈','📉','🛑','⏳','🔁','↩️'],
    'Food & Drink': ['🍽','🍴','☕','🧊','🫗','🥤','🍎','🍌','🥣','🍞','🥚','🧁'],
    'Comfort & Hygiene': ['🛋','🧣','🧴','🤧','🪥','🚿','👕','🧼','🧻','🛁'],
    'Nature & Weather': ['🌙','☀️','🌧','🌈','🌸','🍃','❄️','🔥'],
    'Symbols': ['🆘','✕','🔊','⭐','✅','❌','⚠️','ℹ️','🔄','➕','➖','🏠']
  };

  // ── CSS ──
  const CSS = `
/* ── Admin Panel Overlay ── */
#admin-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg, #1a1a2e);
  color: var(--text, #fff);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, "Helvetica Neue", sans-serif;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  -webkit-user-select: none;
  user-select: none;
}
#admin-panel-overlay.open {
  transform: translateY(0);
}
#admin-panel-overlay * {
  box-sizing: border-box;
}

/* ── Admin Header ── */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${ADMIN_ACCENT};
  flex-shrink: 0;
  min-height: 56px;
}
.admin-header h1 {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: 0.02em;
}
.admin-close-btn {
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  font-size: 1.4rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.admin-close-btn:active {
  background: rgba(255,255,255,0.35);
}

/* ── Section Tabs ── */
.admin-tabs {
  display: flex;
  gap: 2px;
  background: var(--surface, #16213e);
  flex-shrink: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.admin-tab {
  flex: 1;
  min-width: 0;
  padding: 10px 8px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--surface, #16213e);
  color: var(--text-dim, #a0a0b8);
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.admin-tab.active {
  color: #fff;
  border-bottom-color: ${ADMIN_ACCENT};
  background: rgba(142, 68, 173, 0.15);
}

/* ── Admin Content Area ── */
.admin-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}

/* ── Cards ── */
.admin-card {
  background: var(--surface, #16213e);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}
.admin-card h2 {
  font-size: 1rem;
  margin: 0 0 12px 0;
  color: ${ADMIN_ACCENT_LIGHT};
}
.admin-card p {
  font-size: 0.85rem;
  color: var(--text-dim, #a0a0b8);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

/* ── List Items (categories, tiles) ── */
.admin-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.admin-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--card, #0f3460);
  border-radius: 10px;
  margin-bottom: 6px;
  min-height: 48px;
}
.admin-list-item .item-drag {
  color: var(--text-dim, #a0a0b8);
  font-size: 1.2rem;
  cursor: grab;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}
.admin-list-item .item-emoji {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 36px;
  text-align: center;
}
.admin-list-item .item-text {
  flex: 1;
  min-width: 0;
}
.admin-list-item .item-label {
  font-weight: 600;
  font-size: 0.95rem;
}
.admin-list-item .item-sub {
  font-size: 0.75rem;
  color: var(--text-dim, #a0a0b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.admin-list-item .item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* ── Small icon buttons ── */
.admin-icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(255,255,255,0.1);
}
.admin-icon-btn:active {
  background: rgba(255,255,255,0.25);
}
.admin-icon-btn.danger {
  background: rgba(231, 76, 60, 0.3);
}
.admin-icon-btn.danger:active {
  background: rgba(231, 76, 60, 0.6);
}
.admin-icon-btn.move-up,
.admin-icon-btn.move-down {
  background: rgba(52, 152, 219, 0.3);
}

/* ── Buttons ── */
.admin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: ${ADMIN_ACCENT};
  min-height: 44px;
}
.admin-btn:active {
  opacity: 0.8;
}
.admin-btn.secondary {
  background: rgba(255,255,255,0.12);
}
.admin-btn.danger {
  background: var(--danger, #e74c3c);
}
.admin-btn.success {
  background: var(--success, #2ecc71);
}
.admin-btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

/* ── Form Fields ── */
.admin-field {
  margin-bottom: 12px;
}
.admin-field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim, #a0a0b8);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.admin-field input,
.admin-field textarea {
  width: 100%;
  padding: 10px 12px;
  background: var(--card, #0f3460);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
}
.admin-field input:focus,
.admin-field textarea:focus {
  border-color: ${ADMIN_ACCENT};
}
.admin-field textarea {
  min-height: 80px;
  resize: vertical;
}

/* ── Emoji Picker ── */
.emoji-picker-container {
  background: var(--card, #0f3460);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  max-height: 300px;
  overflow-y: auto;
}
.emoji-picker-group-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: ${ADMIN_ACCENT_LIGHT};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 8px 0 6px 0;
}
.emoji-picker-group-title:first-child {
  margin-top: 0;
}
.emoji-picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.emoji-pick {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  background: none;
}
.emoji-pick:active,
.emoji-pick.selected {
  border-color: ${ADMIN_ACCENT};
  background: rgba(142, 68, 173, 0.25);
}

/* ── Image preview ── */
.admin-img-preview {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  object-fit: cover;
  background: var(--card, #0f3460);
  border: 2px solid rgba(255,255,255,0.1);
}

/* ── Modal / Dialog ── */
.admin-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.admin-modal {
  background: var(--surface, #16213e);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.admin-modal h3 {
  font-size: 1.1rem;
  margin: 0 0 16px 0;
  color: ${ADMIN_ACCENT_LIGHT};
}

/* ── Toast ── */
.admin-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: ${ADMIN_ACCENT};
  color: #fff;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  z-index: 10002;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;
}
.admin-toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Gear icon (entry point) ── */
.admin-gear-icon {
  position: fixed;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: rgba(255,255,255,0.25);
  cursor: pointer;
  z-index: 100;
  border: none;
  background: none;
  border-radius: 50%;
}
.admin-gear-icon:active {
  color: rgba(255,255,255,0.5);
}

/* ── Tile image inside list ── */
.admin-tile-img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

/* ── Import textarea ── */
.admin-import-area {
  width: 100%;
  min-height: 120px;
  background: var(--card, #0f3460);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-family: monospace;
  font-size: 0.8rem;
  padding: 10px;
  resize: vertical;
}
.admin-import-area:focus {
  border-color: ${ADMIN_ACCENT};
  outline: none;
}

/* ── Category color chips ── */
.color-chip {
  display: inline-block;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
}
.color-chip.selected {
  border-color: #fff;
  box-shadow: 0 0 0 2px ${ADMIN_ACCENT};
}
.color-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
}

/* ── Section back button (for tiles sub-nav) ── */
.admin-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 12px;
}
`;

  // ── Category background colors ──
  const CATEGORY_COLORS = [
    { name: 'Blue', bg: '#1a5276', cls: 'cat-needs' },
    { name: 'Red', bg: '#7b241c', cls: 'cat-pain' },
    { name: 'Green', bg: '#1e8449', cls: 'cat-feelings' },
    { name: 'Purple', bg: '#6c3483', cls: 'cat-people' },
    { name: 'Gold', bg: '#b9770e', cls: 'cat-actions' },
    { name: 'Teal', bg: '#117a65', cls: 'cat-comfort' },
    { name: 'Navy', bg: '#1b2631', cls: 'cat-custom1' },
    { name: 'Brown', bg: '#6e2c00', cls: 'cat-custom2' },
    { name: 'Slate', bg: '#2c3e50', cls: 'cat-custom3' },
    { name: 'Dark Green', bg: '#0b5345', cls: 'cat-custom4' },
  ];

  // ── Helpers ──

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function generateId() {
    return 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function toast(msg) {
    let t = document.getElementById('admin-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'admin-toast';
      t.className = 'admin-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ── Storage ──

  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_categories));
    } catch (e) {
      console.error('AdminPanel: failed to save config', e);
      toast('Error saving — storage may be full');
    }
  }

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('AdminPanel: failed to load config', e);
    }
    return null;
  }

  // ── Apply categories to main app ──

  function applyToApp() {
    saveConfig();
    if (_renderGrid) _renderGrid();
  }

  // ── Inject CSS ──

  function injectStyles() {
    if (_styleEl) return;
    _styleEl = document.createElement('style');
    _styleEl.id = 'admin-panel-styles';
    _styleEl.textContent = CSS;
    document.head.appendChild(_styleEl);
  }

  // ── Gear icon + triple-tap ──

  function createGearIcon() {
    if (_gearEl) return;
    _gearEl = document.createElement('button');
    _gearEl.className = 'admin-gear-icon';
    _gearEl.setAttribute('aria-label', 'Admin settings');
    _gearEl.innerHTML = '\u2699';
    _gearEl.addEventListener('click', function (e) {
      e.stopPropagation();
      open();
    });
    document.body.appendChild(_gearEl);
  }

  function setupTripleTap() {
    // Triple-tap on any element with id containing "app" or class "tab" area,
    // or the title/header area. We look for a title element or the #quickbar.
    let tapCount = 0;
    let tapTimer = null;
    const target = document.getElementById('quickbar') || document.getElementById('app');
    if (!target) return;

    target.addEventListener('click', function (e) {
      // Only count taps on the quickbar container itself or its title area
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => { tapCount = 0; }, 800);
      }
      if (tapCount >= 3) {
        clearTimeout(tapTimer);
        tapCount = 0;
        open();
      }
    });
  }

  // ── Panel DOM ──

  function createPanel() {
    if (_panelEl) return;
    _panelEl = document.createElement('div');
    _panelEl.id = 'admin-panel-overlay';
    document.body.appendChild(_panelEl);
  }

  // ── Rendering helpers ──

  function getCategoryKeys() {
    return Object.keys(_categories);
  }

  function getCategoryDisplayName(key) {
    // Derive a display name from the key
    // Check if category has a 'name' property; if not use the key capitalized
    const cat = _categories[key];
    if (cat && cat.name) return cat.name;
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function getCategoryEmoji(key) {
    const cat = _categories[key];
    if (cat && cat.emoji) return cat.emoji;
    // Fallback: look at first tile
    if (cat && cat.tiles && cat.tiles.length > 0) return cat.tiles[0].emoji;
    return '📁';
  }

  // ── Build Emoji Picker HTML ──

  function buildEmojiPicker(selectedEmoji, pickerId) {
    let html = `<div class="emoji-picker-container" id="${pickerId}">`;
    for (const [groupName, emojis] of Object.entries(EMOJI_GROUPS)) {
      html += `<div class="emoji-picker-group-title">${escHtml(groupName)}</div>`;
      html += `<div class="emoji-picker-grid">`;
      for (const em of emojis) {
        const sel = em === selectedEmoji ? ' selected' : '';
        html += `<button class="emoji-pick${sel}" data-emoji="${escHtml(em)}" type="button">${em}</button>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }

  // ── Section: Categories ──

  function renderCategories() {
    const keys = getCategoryKeys();
    let html = `<div class="admin-card">
      <h2>Categories (${keys.length})</h2>
      <p>Tap a category to edit its tiles. Use arrows to reorder.</p>
      <ul class="admin-list">`;

    keys.forEach((key, i) => {
      const cat = _categories[key];
      const name = getCategoryDisplayName(key);
      const emoji = getCategoryEmoji(key);
      const tileCount = (cat.tiles || []).length;
      html += `
        <li class="admin-list-item" data-cat-key="${escHtml(key)}">
          <span class="item-emoji">${emoji}</span>
          <div class="item-text">
            <div class="item-label">${escHtml(name)}</div>
            <div class="item-sub">${tileCount} tile${tileCount !== 1 ? 's' : ''} &middot; ${escHtml(cat.className || '')}</div>
          </div>
          <div class="item-actions">
            <button class="admin-icon-btn move-up" data-action="cat-up" data-key="${escHtml(key)}" ${i === 0 ? 'disabled style="opacity:0.3"' : ''} title="Move up">\u25B2</button>
            <button class="admin-icon-btn move-down" data-action="cat-down" data-key="${escHtml(key)}" ${i === keys.length - 1 ? 'disabled style="opacity:0.3"' : ''} title="Move down">\u25BC</button>
            <button class="admin-icon-btn" data-action="cat-edit" data-key="${escHtml(key)}" title="Edit">\u270E</button>
            <button class="admin-icon-btn" data-action="cat-tiles" data-key="${escHtml(key)}" title="Edit tiles">\u25A6</button>
            <button class="admin-icon-btn danger" data-action="cat-delete" data-key="${escHtml(key)}" title="Delete">\u2716</button>
          </div>
        </li>`;
    });

    html += `</ul>
      <div class="admin-btn-row">
        <button class="admin-btn" data-action="cat-add">+ Add Category</button>
      </div>
    </div>`;

    return html;
  }

  // ── Section: Tiles for a category ──

  function renderTiles(catKey) {
    const cat = _categories[catKey];
    if (!cat) return '<p>Category not found.</p>';

    const name = getCategoryDisplayName(catKey);
    const tiles = cat.tiles || [];

    let html = `<button class="admin-back-btn" data-action="back-to-cats">\u2190 Back to Categories</button>`;
    html += `<div class="admin-card">
      <h2>Tiles in "${escHtml(name)}" (${tiles.length})</h2>
      <ul class="admin-list">`;

    tiles.forEach((tile, i) => {
      const hasImage = tile.image ? true : false;
      html += `
        <li class="admin-list-item" data-tile-idx="${i}">
          ${hasImage
            ? `<img class="admin-tile-img" src="${escHtml(tile.image)}" alt="">`
            : `<span class="item-emoji">${tile.emoji || ''}</span>`
          }
          <div class="item-text">
            <div class="item-label">${escHtml(tile.label)}</div>
            <div class="item-sub">${escHtml(tile.phrase)}</div>
          </div>
          <div class="item-actions">
            <button class="admin-icon-btn move-up" data-action="tile-up" data-idx="${i}" ${i === 0 ? 'disabled style="opacity:0.3"' : ''} title="Move up">\u25B2</button>
            <button class="admin-icon-btn move-down" data-action="tile-down" data-idx="${i}" ${i === tiles.length - 1 ? 'disabled style="opacity:0.3"' : ''} title="Move down">\u25BC</button>
            <button class="admin-icon-btn" data-action="tile-edit" data-idx="${i}" title="Edit">\u270E</button>
            <button class="admin-icon-btn danger" data-action="tile-delete" data-idx="${i}" title="Delete">\u2716</button>
          </div>
        </li>`;
    });

    html += `</ul>
      <div class="admin-btn-row">
        <button class="admin-btn" data-action="tile-add">+ Add Tile</button>
        <button class="admin-btn secondary" data-action="tile-add-image">+ Add Image Tile</button>
      </div>
    </div>`;

    return html;
  }

  // ── Section: Custom Phrases (quick add) ──

  function renderPhrases() {
    let html = `<div class="admin-card">
      <h2>Quick Add Custom Phrase</h2>
      <p>Create a new tile and place it in any category.</p>
      <div class="admin-field">
        <label>Emoji</label>
        <div id="phrase-emoji-display" style="font-size:2rem; margin-bottom:8px; cursor:pointer;" data-action="phrase-pick-emoji">
          ${_phraseEmoji || '😊'} <span style="font-size:0.8rem; color:var(--text-dim)">(tap to change)</span>
        </div>
        ${buildEmojiPicker(_phraseEmoji || '😊', 'phrase-emoji-picker')}
      </div>
      <div class="admin-field">
        <label>Label (short, displayed on tile)</label>
        <input type="text" id="phrase-label" placeholder="e.g. Music" maxlength="30">
      </div>
      <div class="admin-field">
        <label>Spoken Phrase</label>
        <input type="text" id="phrase-text" placeholder="e.g. I want to listen to music" maxlength="200">
      </div>
      <div class="admin-field">
        <label>Add to Category</label>
        <select id="phrase-category" style="width:100%; padding:10px 12px; background:var(--card, #0f3460); border:2px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; font-size:1rem;">
          ${getCategoryKeys().map(k => `<option value="${escHtml(k)}">${escHtml(getCategoryDisplayName(k))}</option>`).join('')}
        </select>
      </div>
      <div class="admin-btn-row">
        <button class="admin-btn success" data-action="phrase-save">Add Phrase</button>
      </div>
    </div>`;
    return html;
  }

  let _phraseEmoji = '😊';

  // ── Section: Import / Export / Reset ──

  function renderTransfer() {
    let html = `<div class="admin-card">
      <h2>Export Configuration</h2>
      <p>Save your entire configuration as JSON for backup or transfer to another device.</p>
      <div class="admin-btn-row">
        <button class="admin-btn success" data-action="export-config">Export as JSON</button>
        <button class="admin-btn secondary" data-action="export-copy">Copy to Clipboard</button>
      </div>
      <textarea class="admin-import-area" id="export-area" readonly style="margin-top:12px; display:none;"></textarea>
    </div>`;

    html += `<div class="admin-card">
      <h2>Import Configuration</h2>
      <p>Paste a previously exported JSON configuration to restore or transfer settings.</p>
      <textarea class="admin-import-area" id="import-area" placeholder="Paste JSON here..."></textarea>
      <div class="admin-btn-row" style="margin-top:8px;">
        <button class="admin-btn" data-action="import-config">Import</button>
      </div>
    </div>`;

    html += `<div class="admin-card">
      <h2>Reset to Factory Defaults</h2>
      <p>Remove all customizations and restore the original built-in categories and phrases.</p>
      <div class="admin-btn-row">
        <button class="admin-btn danger" data-action="reset-defaults">Reset Everything</button>
      </div>
    </div>`;

    return html;
  }

  // ── Main Panel Render ──

  function renderPanel() {
    if (!_panelEl) return;

    const sections = [
      { id: 'categories', label: 'Categories' },
      { id: 'tiles',      label: 'Tiles' },
      { id: 'phrases',    label: 'New Phrase' },
      { id: 'transfer',   label: 'Import/Export' },
    ];

    let contentHtml = '';
    switch (_currentSection) {
      case 'categories':
        contentHtml = renderCategories();
        break;
      case 'tiles':
        if (_selectedCategory && _categories[_selectedCategory]) {
          contentHtml = renderTiles(_selectedCategory);
        } else {
          _currentSection = 'categories';
          contentHtml = renderCategories();
        }
        break;
      case 'phrases':
        contentHtml = renderPhrases();
        break;
      case 'transfer':
        contentHtml = renderTransfer();
        break;
      default:
        contentHtml = renderCategories();
    }

    _panelEl.innerHTML = `
      <div class="admin-header">
        <h1>\u2699 Admin Panel</h1>
        <button class="admin-close-btn" data-action="close" aria-label="Close admin">\u2716</button>
      </div>
      <div class="admin-tabs">
        ${sections.map(s => `<button class="admin-tab${_currentSection === s.id ? ' active' : ''}" data-section="${s.id}">${s.label}</button>`).join('')}
      </div>
      <div class="admin-content" id="admin-content">
        ${contentHtml}
      </div>
    `;

    bindPanelEvents();
  }

  // ── Event Delegation ──

  function bindPanelEvents() {
    if (!_panelEl) return;

    _panelEl.addEventListener('click', function handler(e) {
      const btn = e.target.closest('[data-action]');
      const tab = e.target.closest('[data-section]');
      const emojiBtn = e.target.closest('.emoji-pick');

      if (tab) {
        _currentSection = tab.dataset.section;
        if (_currentSection === 'tiles' && !_selectedCategory) {
          _currentSection = 'categories';
        }
        renderPanel();
        return;
      }

      if (emojiBtn) {
        handleEmojiPick(emojiBtn);
        return;
      }

      if (!btn) return;
      const action = btn.dataset.action;

      switch (action) {
        case 'close': close(); break;
        case 'cat-up': moveCategoryUp(btn.dataset.key); break;
        case 'cat-down': moveCategoryDown(btn.dataset.key); break;
        case 'cat-edit': showCategoryEditModal(btn.dataset.key); break;
        case 'cat-tiles':
          _selectedCategory = btn.dataset.key;
          _currentSection = 'tiles';
          renderPanel();
          break;
        case 'cat-delete': deleteCategory(btn.dataset.key); break;
        case 'cat-add': showCategoryAddModal(); break;
        case 'back-to-cats':
          _currentSection = 'categories';
          _selectedCategory = null;
          renderPanel();
          break;
        case 'tile-up': moveTile(_selectedCategory, parseInt(btn.dataset.idx), -1); break;
        case 'tile-down': moveTile(_selectedCategory, parseInt(btn.dataset.idx), 1); break;
        case 'tile-edit': showTileEditModal(_selectedCategory, parseInt(btn.dataset.idx)); break;
        case 'tile-delete': deleteTile(_selectedCategory, parseInt(btn.dataset.idx)); break;
        case 'tile-add': showTileAddModal(_selectedCategory, false); break;
        case 'tile-add-image': showTileAddModal(_selectedCategory, true); break;
        case 'phrase-pick-emoji': /* emoji picker is inline */ break;
        case 'phrase-save': saveQuickPhrase(); break;
        case 'export-config': exportConfig_ui(); break;
        case 'export-copy': exportCopyClipboard(); break;
        case 'import-config': importConfig_ui(); break;
        case 'reset-defaults': confirmReset(); break;
      }
    });
  }

  function handleEmojiPick(btn) {
    const emoji = btn.dataset.emoji;
    const picker = btn.closest('.emoji-picker-container');
    if (!picker) return;

    // Deselect all in this picker
    picker.querySelectorAll('.emoji-pick').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    // Determine context: is this the phrase picker or a modal picker?
    if (picker.id === 'phrase-emoji-picker') {
      _phraseEmoji = emoji;
      const display = document.getElementById('phrase-emoji-display');
      if (display) {
        display.innerHTML = `${emoji} <span style="font-size:0.8rem; color:var(--text-dim)">(tap to change)</span>`;
      }
    } else if (picker.id === 'modal-emoji-picker') {
      const field = document.getElementById('modal-emoji-value');
      if (field) field.value = emoji;
      const preview = document.getElementById('modal-emoji-preview');
      if (preview) preview.textContent = emoji;
    }
  }

  // ── Category Operations ──

  function moveCategoryUp(key) {
    const keys = getCategoryKeys();
    const idx = keys.indexOf(key);
    if (idx <= 0) return;
    // Rebuild _categories with swapped order
    const newCats = {};
    for (let i = 0; i < keys.length; i++) {
      if (i === idx - 1) {
        newCats[keys[idx]] = _categories[keys[idx]];
      } else if (i === idx) {
        newCats[keys[idx - 1]] = _categories[keys[idx - 1]];
      } else {
        newCats[keys[i]] = _categories[keys[i]];
      }
    }
    replaceCategories(newCats);
    renderPanel();
    applyToApp();
  }

  function moveCategoryDown(key) {
    const keys = getCategoryKeys();
    const idx = keys.indexOf(key);
    if (idx < 0 || idx >= keys.length - 1) return;
    const newCats = {};
    for (let i = 0; i < keys.length; i++) {
      if (i === idx) {
        newCats[keys[idx + 1]] = _categories[keys[idx + 1]];
      } else if (i === idx + 1) {
        newCats[keys[idx]] = _categories[keys[idx]];
      } else {
        newCats[keys[i]] = _categories[keys[i]];
      }
    }
    replaceCategories(newCats);
    renderPanel();
    applyToApp();
  }

  function replaceCategories(newCats) {
    // Clear and repopulate _categories in-place (so main app's reference stays valid)
    for (const k of Object.keys(_categories)) {
      delete _categories[k];
    }
    for (const [k, v] of Object.entries(newCats)) {
      _categories[k] = v;
    }
  }

  function deleteCategory(key) {
    const name = getCategoryDisplayName(key);
    if (!confirm(`Delete category "${name}" and all its tiles? This cannot be undone.`)) return;
    delete _categories[key];
    if (_selectedCategory === key) _selectedCategory = null;
    renderPanel();
    applyToApp();
    toast(`Deleted "${name}"`);
  }

  function showCategoryEditModal(key) {
    const cat = _categories[key];
    if (!cat) return;

    const name = getCategoryDisplayName(key);
    const emoji = getCategoryEmoji(key);
    const currentColor = cat.className || '';

    const backdrop = document.createElement('div');
    backdrop.className = 'admin-modal-backdrop';
    backdrop.innerHTML = `
      <div class="admin-modal">
        <h3>Edit Category</h3>
        <div class="admin-field">
          <label>Category Name</label>
          <input type="text" id="modal-cat-name" value="${escHtml(name)}" maxlength="30">
        </div>
        <div class="admin-field">
          <label>Category Emoji</label>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span id="modal-emoji-preview" style="font-size:2rem;">${emoji}</span>
            <input type="hidden" id="modal-emoji-value" value="${escHtml(emoji)}">
          </div>
          ${buildEmojiPicker(emoji, 'modal-emoji-picker')}
        </div>
        <div class="admin-field">
          <label>Tile Color</label>
          <div class="color-chips">
            ${CATEGORY_COLORS.map(c => `<div class="color-chip${currentColor === c.cls ? ' selected' : ''}" style="background:${c.bg}" data-cls="${c.cls}" title="${c.name}"></div>`).join('')}
          </div>
        </div>
        <div class="admin-btn-row" style="margin-top:16px;">
          <button class="admin-btn success" id="modal-cat-save">Save</button>
          <button class="admin-btn secondary" id="modal-cat-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Color chip selection
    backdrop.querySelectorAll('.color-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        backdrop.querySelectorAll('.color-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });

    // Emoji pick within modal
    backdrop.querySelectorAll('.emoji-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        backdrop.querySelectorAll('.emoji-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const val = btn.dataset.emoji;
        document.getElementById('modal-emoji-value').value = val;
        document.getElementById('modal-emoji-preview').textContent = val;
      });
    });

    backdrop.querySelector('#modal-cat-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

    backdrop.querySelector('#modal-cat-save').addEventListener('click', () => {
      const newName = document.getElementById('modal-cat-name').value.trim();
      const newEmoji = document.getElementById('modal-emoji-value').value;
      const selectedChip = backdrop.querySelector('.color-chip.selected');
      const newCls = selectedChip ? selectedChip.dataset.cls : currentColor;

      if (!newName) { toast('Name cannot be empty'); return; }

      cat.name = newName;
      cat.emoji = newEmoji;
      cat.className = newCls;

      backdrop.remove();
      renderPanel();
      applyToApp();
      toast(`Updated "${newName}"`);
    });
  }

  function showCategoryAddModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'admin-modal-backdrop';
    backdrop.innerHTML = `
      <div class="admin-modal">
        <h3>Add New Category</h3>
        <div class="admin-field">
          <label>Category Name</label>
          <input type="text" id="modal-cat-name" placeholder="e.g. Activities" maxlength="30">
        </div>
        <div class="admin-field">
          <label>Category Emoji</label>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span id="modal-emoji-preview" style="font-size:2rem;">📁</span>
            <input type="hidden" id="modal-emoji-value" value="📁">
          </div>
          ${buildEmojiPicker('📁', 'modal-emoji-picker')}
        </div>
        <div class="admin-field">
          <label>Tile Color</label>
          <div class="color-chips">
            ${CATEGORY_COLORS.map((c, i) => `<div class="color-chip${i === 0 ? ' selected' : ''}" style="background:${c.bg}" data-cls="${c.cls}" title="${c.name}"></div>`).join('')}
          </div>
        </div>
        <div class="admin-btn-row" style="margin-top:16px;">
          <button class="admin-btn success" id="modal-cat-save">Create</button>
          <button class="admin-btn secondary" id="modal-cat-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelectorAll('.color-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        backdrop.querySelectorAll('.color-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });

    backdrop.querySelectorAll('.emoji-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        backdrop.querySelectorAll('.emoji-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('modal-emoji-value').value = btn.dataset.emoji;
        document.getElementById('modal-emoji-preview').textContent = btn.dataset.emoji;
      });
    });

    backdrop.querySelector('#modal-cat-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

    backdrop.querySelector('#modal-cat-save').addEventListener('click', () => {
      const name = document.getElementById('modal-cat-name').value.trim();
      const emoji = document.getElementById('modal-emoji-value').value;
      const selectedChip = backdrop.querySelector('.color-chip.selected');
      const cls = selectedChip ? selectedChip.dataset.cls : 'cat-custom1';

      if (!name) { toast('Name is required'); return; }

      const id = generateId();
      _categories[id] = {
        name: name,
        emoji: emoji,
        className: cls,
        tiles: []
      };

      backdrop.remove();
      renderPanel();
      applyToApp();
      toast(`Created "${name}"`);
    });
  }

  // ── Tile Operations ──

  function moveTile(catKey, idx, dir) {
    const tiles = _categories[catKey].tiles;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tiles.length) return;
    [tiles[idx], tiles[newIdx]] = [tiles[newIdx], tiles[idx]];
    renderPanel();
    applyToApp();
  }

  function deleteTile(catKey, idx) {
    const tile = _categories[catKey].tiles[idx];
    if (!confirm(`Delete tile "${tile.label}"?`)) return;
    _categories[catKey].tiles.splice(idx, 1);
    renderPanel();
    applyToApp();
    toast(`Deleted "${tile.label}"`);
  }

  function showTileEditModal(catKey, idx) {
    const tile = _categories[catKey].tiles[idx];
    if (!tile) return;

    const hasImage = !!tile.image;

    const backdrop = document.createElement('div');
    backdrop.className = 'admin-modal-backdrop';
    backdrop.innerHTML = `
      <div class="admin-modal">
        <h3>Edit Tile</h3>
        ${!hasImage ? `
        <div class="admin-field">
          <label>Emoji</label>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span id="modal-emoji-preview" style="font-size:2rem;">${tile.emoji || '😊'}</span>
            <input type="hidden" id="modal-emoji-value" value="${escHtml(tile.emoji || '😊')}">
          </div>
          ${buildEmojiPicker(tile.emoji || '😊', 'modal-emoji-picker')}
        </div>
        ` : `
        <div class="admin-field">
          <label>Image (base64 data URL)</label>
          <img class="admin-img-preview" src="${escHtml(tile.image)}" alt="" style="display:block; margin-bottom:8px;">
          <textarea id="modal-tile-image" style="width:100%;min-height:60px;background:var(--card);border:2px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-family:monospace;font-size:0.7rem;padding:8px;">${escHtml(tile.image)}</textarea>
          <div class="admin-btn-row" style="margin-top:4px;">
            <button class="admin-btn secondary" id="modal-switch-emoji" style="font-size:0.8rem;">Switch to Emoji</button>
          </div>
        </div>
        `}
        <div class="admin-field">
          <label>Label</label>
          <input type="text" id="modal-tile-label" value="${escHtml(tile.label)}" maxlength="30">
        </div>
        <div class="admin-field">
          <label>Spoken Phrase</label>
          <input type="text" id="modal-tile-phrase" value="${escHtml(tile.phrase)}" maxlength="200">
        </div>
        <div class="admin-btn-row" style="margin-top:16px;">
          <button class="admin-btn success" id="modal-tile-save">Save</button>
          <button class="admin-btn secondary" id="modal-tile-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Emoji picking inside modal
    backdrop.querySelectorAll('.emoji-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        backdrop.querySelectorAll('.emoji-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('modal-emoji-value').value = btn.dataset.emoji;
        document.getElementById('modal-emoji-preview').textContent = btn.dataset.emoji;
      });
    });

    // Switch from image to emoji
    const switchBtn = backdrop.querySelector('#modal-switch-emoji');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        tile.image = undefined;
        tile.emoji = '😊';
        backdrop.remove();
        showTileEditModal(catKey, idx);
      });
    }

    backdrop.querySelector('#modal-tile-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

    backdrop.querySelector('#modal-tile-save').addEventListener('click', () => {
      const label = document.getElementById('modal-tile-label').value.trim();
      const phrase = document.getElementById('modal-tile-phrase').value.trim();

      if (!label) { toast('Label is required'); return; }
      if (!phrase) { toast('Phrase is required'); return; }

      tile.label = label;
      tile.phrase = phrase;

      if (!hasImage) {
        const emojiVal = document.getElementById('modal-emoji-value');
        tile.emoji = emojiVal ? emojiVal.value : tile.emoji;
        delete tile.image;
      } else {
        const imgVal = document.getElementById('modal-tile-image');
        if (imgVal) tile.image = imgVal.value.trim();
      }

      backdrop.remove();
      renderPanel();
      applyToApp();
      toast(`Updated "${label}"`);
    });
  }

  function showTileAddModal(catKey, withImage) {
    const backdrop = document.createElement('div');
    backdrop.className = 'admin-modal-backdrop';

    let imageFieldHtml = '';
    if (withImage) {
      imageFieldHtml = `
        <div class="admin-field">
          <label>Image (paste base64 data URL)</label>
          <textarea id="modal-tile-image" style="width:100%;min-height:80px;background:var(--card);border:2px solid rgba(255,255,255,0.1);border-radius:8px;color:#fff;font-family:monospace;font-size:0.7rem;padding:8px;" placeholder="data:image/png;base64,..."></textarea>
          <p style="font-size:0.75rem; color:var(--text-dim); margin-top:4px;">
            Paste a base64 data URL. On iPad you can take a screenshot, convert via an online tool, and paste here.
          </p>
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="admin-modal">
        <h3>Add ${withImage ? 'Image' : 'New'} Tile</h3>
        ${!withImage ? `
        <div class="admin-field">
          <label>Emoji</label>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span id="modal-emoji-preview" style="font-size:2rem;">😊</span>
            <input type="hidden" id="modal-emoji-value" value="😊">
          </div>
          ${buildEmojiPicker('😊', 'modal-emoji-picker')}
        </div>
        ` : imageFieldHtml}
        <div class="admin-field">
          <label>Label</label>
          <input type="text" id="modal-tile-label" placeholder="e.g. Water" maxlength="30">
        </div>
        <div class="admin-field">
          <label>Spoken Phrase</label>
          <input type="text" id="modal-tile-phrase" placeholder="e.g. I need water" maxlength="200">
        </div>
        <div class="admin-btn-row" style="margin-top:16px;">
          <button class="admin-btn success" id="modal-tile-save">Add</button>
          <button class="admin-btn secondary" id="modal-tile-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelectorAll('.emoji-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        backdrop.querySelectorAll('.emoji-pick').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('modal-emoji-value').value = btn.dataset.emoji;
        document.getElementById('modal-emoji-preview').textContent = btn.dataset.emoji;
      });
    });

    backdrop.querySelector('#modal-tile-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });

    backdrop.querySelector('#modal-tile-save').addEventListener('click', () => {
      const label = document.getElementById('modal-tile-label').value.trim();
      const phrase = document.getElementById('modal-tile-phrase').value.trim();

      if (!label) { toast('Label is required'); return; }
      if (!phrase) { toast('Phrase is required'); return; }

      const newTile = { label, phrase };

      if (withImage) {
        const imgArea = document.getElementById('modal-tile-image');
        const imgVal = imgArea ? imgArea.value.trim() : '';
        if (!imgVal) { toast('Image data URL is required'); return; }
        if (!imgVal.startsWith('data:')) { toast('Must be a data: URL (base64)'); return; }
        newTile.image = imgVal;
        newTile.emoji = '🖼';
      } else {
        const emojiVal = document.getElementById('modal-emoji-value');
        newTile.emoji = emojiVal ? emojiVal.value : '😊';
      }

      if (!_categories[catKey].tiles) _categories[catKey].tiles = [];
      _categories[catKey].tiles.push(newTile);

      backdrop.remove();
      renderPanel();
      applyToApp();
      toast(`Added "${label}"`);
    });
  }

  // ── Quick Phrase ──

  function saveQuickPhrase() {
    const label = document.getElementById('phrase-label').value.trim();
    const phrase = document.getElementById('phrase-text').value.trim();
    const catKey = document.getElementById('phrase-category').value;

    if (!label) { toast('Label is required'); return; }
    if (!phrase) { toast('Phrase is required'); return; }
    if (!_categories[catKey]) { toast('Invalid category'); return; }

    _categories[catKey].tiles.push({
      emoji: _phraseEmoji || '😊',
      label: label,
      phrase: phrase
    });

    // Clear form
    document.getElementById('phrase-label').value = '';
    document.getElementById('phrase-text').value = '';
    _phraseEmoji = '😊';

    applyToApp();
    toast(`Added "${label}" to ${getCategoryDisplayName(catKey)}`);

    // Re-render to reset emoji display
    renderPanel();
  }

  // ── Import / Export / Reset ──

  function exportConfig_ui() {
    const json = exportConfig();
    const area = document.getElementById('export-area');
    if (area) {
      area.value = json;
      area.style.display = 'block';
      area.focus();
      area.select();
    }
    toast('Configuration exported');
  }

  function exportCopyClipboard() {
    const json = exportConfig();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(() => {
        toast('Copied to clipboard');
      }).catch(() => {
        // Fallback
        exportConfig_ui();
        toast('Shown below — manually copy');
      });
    } else {
      exportConfig_ui();
      toast('Shown below — manually copy');
    }
  }

  function importConfig_ui() {
    const area = document.getElementById('import-area');
    if (!area) return;
    const raw = area.value.trim();
    if (!raw) { toast('Paste JSON first'); return; }

    if (!confirm('Import this configuration? This will replace all current categories and tiles.')) return;

    try {
      importConfig(raw);
      area.value = '';
      renderPanel();
      toast('Configuration imported successfully');
    } catch (e) {
      toast('Import failed: ' + e.message);
    }
  }

  function confirmReset() {
    if (!confirm('Reset ALL customizations? This will restore the original built-in categories and remove all changes. This cannot be undone.')) return;
    resetToDefaults();
    renderPanel();
    toast('Reset to factory defaults');
  }

  // ── Public API Implementation ──

  function init(categoriesRef, renderGridFn) {
    _renderGrid = renderGridFn;

    // Snapshot the defaults before any customization
    _defaultCategories = deepClone(categoriesRef);

    // Check localStorage for saved customizations
    const saved = loadConfig();
    if (saved) {
      // Apply saved config into the live categories object
      // Clear existing keys
      for (const k of Object.keys(categoriesRef)) {
        delete categoriesRef[k];
      }
      // Apply saved
      for (const [k, v] of Object.entries(saved)) {
        categoriesRef[k] = v;
      }
    }

    _categories = categoriesRef;

    injectStyles();
    createGearIcon();
    setupTripleTap();
    createPanel();
  }

  function open() {
    if (_isOpen) return;
    _isOpen = true;
    _currentSection = 'categories';
    _selectedCategory = null;
    renderPanel();
    // Trigger slide-in on next frame
    requestAnimationFrame(() => {
      _panelEl.classList.add('open');
    });
  }

  function close() {
    if (!_isOpen) return;
    _isOpen = false;
    _panelEl.classList.remove('open');
    // Re-render main app in case changes were made
    applyToApp();
  }

  function exportConfig() {
    return JSON.stringify(_categories, null, 2);
  }

  function importConfig(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Invalid JSON');
    }

    // Basic validation: must be an object with at least one category
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Config must be a JSON object');
    }

    const keys = Object.keys(parsed);
    if (keys.length === 0) {
      throw new Error('Config must contain at least one category');
    }

    // Validate each category has tiles array
    for (const key of keys) {
      const cat = parsed[key];
      if (!cat || typeof cat !== 'object') {
        throw new Error(`Category "${key}" is invalid`);
      }
      if (!Array.isArray(cat.tiles)) {
        throw new Error(`Category "${key}" must have a tiles array`);
      }
      // Validate each tile
      for (let i = 0; i < cat.tiles.length; i++) {
        const t = cat.tiles[i];
        if (!t.label || !t.phrase) {
          throw new Error(`Tile ${i} in "${key}" needs label and phrase`);
        }
      }
    }

    // Apply
    replaceCategories(parsed);
    applyToApp();
  }

  function resetToDefaults() {
    if (!_defaultCategories) return;
    const fresh = deepClone(_defaultCategories);
    replaceCategories(fresh);
    localStorage.removeItem(STORAGE_KEY);
    applyToApp();
  }

  function getCategories() {
    const saved = loadConfig();
    if (saved) return saved;
    if (_defaultCategories) return deepClone(_defaultCategories);
    return _categories ? deepClone(_categories) : {};
  }

  // ── Public API ──
  return {
    init: init,
    open: open,
    close: close,
    exportConfig: exportConfig,
    importConfig: importConfig,
    resetToDefaults: resetToDefaults,
    getCategories: getCategories
  };

})();
