/**
 * RecentsEngine — Recent Requests module for Gordon AAC Communicator
 *
 * Tracks the last 10 spoken phrases with timestamps, persists to localStorage,
 * and renders a horizontal scrollable bar of tappable tiles.
 *
 * Usage:
 *   RecentsEngine.add(phrase, emoji, category)  — log a spoken phrase
 *   RecentsEngine.getAll()                      — get array of last 10 (most recent first)
 *   RecentsEngine.clear()                       — clear history
 *   RecentsEngine.renderBar(containerId)        — render recents bar into a container
 */
var RecentsEngine = (function () {
  'use strict';

  var STORAGE_KEY = 'gordon-recents';
  var MAX_ITEMS = 10;
  var _containerId = null;

  // ── CSS (injected once) ──
  var CSS = [
    '#recents-bar {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 6px var(--gap, 10px);',
    '  flex-shrink: 0;',
    '  min-height: 62px;',
    '  background: var(--surface, #16213e);',
    '  border-bottom: 2px solid var(--card, #0f3460);',
    '}',
    '#recents-bar.empty { display: none; }',
    '',
    '#recents-label {',
    '  flex-shrink: 0;',
    '  font-size: 0.75rem;',
    '  font-weight: 700;',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.08em;',
    '  color: var(--text-dim, #a0a0b8);',
    '  writing-mode: vertical-lr;',
    '  text-orientation: mixed;',
    '  transform: rotate(180deg);',
    '  padding: 0 2px;',
    '}',
    '',
    '#recents-scroll {',
    '  display: flex;',
    '  gap: 8px;',
    '  overflow-x: auto;',
    '  overflow-y: hidden;',
    '  -webkit-overflow-scrolling: touch;',
    '  flex: 1;',
    '  scrollbar-width: none;',
    '}',
    '#recents-scroll::-webkit-scrollbar { display: none; }',
    '',
    '.recent-tile {',
    '  flex-shrink: 0;',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 2px;',
    '  min-width: 72px;',
    '  max-width: 90px;',
    '  min-height: 50px;',
    '  padding: 6px 10px;',
    '  background: var(--card, #0f3460);',
    '  border: 2px solid transparent;',
    '  border-radius: var(--radius, 16px);',
    '  cursor: pointer;',
    '  transition: transform 0.1s, border-color 0.15s, opacity 0.15s;',
    '  -webkit-tap-highlight-color: transparent;',
    '}',
    '.recent-tile:active {',
    '  transform: scale(0.93);',
    '  border-color: var(--accent, #e94560);',
    '  opacity: 0.85;',
    '}',
    '.recent-tile .recent-emoji {',
    '  font-size: 1.6rem;',
    '  line-height: 1.1;',
    '}',
    '.recent-tile .recent-label {',
    '  font-size: 0.7rem;',
    '  font-weight: 600;',
    '  text-align: center;',
    '  line-height: 1.15;',
    '  color: var(--text, #ffffff);',
    '  text-transform: uppercase;',
    '  letter-spacing: 0.02em;',
    '  white-space: nowrap;',
    '  overflow: hidden;',
    '  text-overflow: ellipsis;',
    '  max-width: 80px;',
    '}',
    '.recent-tile .recent-time {',
    '  font-size: 0.55rem;',
    '  color: var(--text-dim, #a0a0b8);',
    '  white-space: nowrap;',
    '}',
    '',
    '#recents-clear-btn {',
    '  flex-shrink: 0;',
    '  width: 32px;',
    '  height: 32px;',
    '  border-radius: 50%;',
    '  background: var(--card, #0f3460);',
    '  border: 1px solid var(--text-dim, #a0a0b8);',
    '  color: var(--text-dim, #a0a0b8);',
    '  font-size: 0.9rem;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  transition: opacity 0.15s;',
    '}',
    '#recents-clear-btn:active { opacity: 0.6; }',
    '',
    '/* Landscape tweaks */',
    '@media (orientation: landscape) {',
    '  #recents-bar { min-height: 54px; padding: 4px var(--gap, 10px); }',
    '  .recent-tile { min-height: 44px; min-width: 64px; padding: 4px 8px; }',
    '  .recent-tile .recent-emoji { font-size: 1.3rem; }',
    '}',
  ].join('\n');

  var _cssInjected = false;

  function _injectCSS() {
    if (_cssInjected) return;
    var style = document.createElement('style');
    style.setAttribute('data-recents-engine', '');
    style.textContent = CSS;
    document.head.appendChild(style);
    _cssInjected = true;
  }

  // ── Storage helpers ──

  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  }

  function _save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      // localStorage full or unavailable — silently fail
    }
  }

  // ── Short label derivation ──
  // Produces a compact label from a phrase, suitable for a small tile.
  // Strategy: if phrase starts with "I need", "I want", "I feel", "I am", etc.,
  // strip the leading subject and return the remainder, capped at ~14 chars.
  function _shortLabel(phrase) {
    var stripped = phrase
      .replace(/^(I need|I want|I am|I feel|Please|Help me|My)\s+/i, '')
      .replace(/^(the|to|a|some|my)\s+/i, '');
    // Capitalize first letter
    stripped = stripped.charAt(0).toUpperCase() + stripped.slice(1);
    if (stripped.length > 16) {
      stripped = stripped.slice(0, 14) + '\u2026';
    }
    return stripped;
  }

  // ── Time formatting ──
  function _relativeTime(ts) {
    var diff = Date.now() - ts;
    var secs = Math.floor(diff / 1000);
    if (secs < 60) return 'now';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + 'm';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    var days = Math.floor(hrs / 24);
    return days + 'd';
  }

  // ── Escape HTML for safe interpolation ──
  function _esc(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Public API ──

  function add(phrase, emoji, category) {
    if (!phrase) return;

    var items = _load();

    // Deduplication: remove existing entry with same phrase
    items = items.filter(function (item) {
      return item.phrase !== phrase;
    });

    // Prepend new entry
    items.unshift({
      phrase: phrase,
      emoji: emoji || '',
      category: category || '',
      ts: Date.now()
    });

    // Cap at MAX_ITEMS
    if (items.length > MAX_ITEMS) {
      items = items.slice(0, MAX_ITEMS);
    }

    _save(items);

    // Re-render if bar is active
    if (_containerId) {
      _renderInto(_containerId);
    }
  }

  function getAll() {
    return _load();
  }

  function clear() {
    _save([]);
    if (_containerId) {
      _renderInto(_containerId);
    }
  }

  // ── Rendering ──

  function _renderInto(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var items = _load();

    // Build the bar
    var bar = document.getElementById('recents-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'recents-bar';
      container.appendChild(bar);
    }

    if (items.length === 0) {
      bar.classList.add('empty');
      bar.innerHTML = '';
      return;
    }

    bar.classList.remove('empty');

    var html = '<div id="recents-label">RECENT</div>';
    html += '<div id="recents-scroll">';

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var label = _shortLabel(item.phrase);
      var escapedPhrase = _esc(item.phrase).replace(/'/g, '&#39;');
      var emoji = item.emoji || '\uD83D\uDD01'; // fallback: repeat emoji

      html += '<div class="recent-tile" '
        + 'onclick="RecentsEngine._speak(\'' + escapedPhrase + '\')" '
        + 'role="button" '
        + 'aria-label="' + _esc(item.phrase) + '">'
        + '<span class="recent-emoji">' + emoji + '</span>'
        + '<span class="recent-label">' + _esc(label) + '</span>'
        + '<span class="recent-time">' + _relativeTime(item.ts) + '</span>'
        + '</div>';
    }

    html += '</div>'; // close scroll
    html += '<button id="recents-clear-btn" onclick="RecentsEngine.clear()" aria-label="Clear recents" title="Clear recents">\u2715</button>';

    bar.innerHTML = html;
  }

  function renderBar(containerId) {
    _injectCSS();
    _containerId = containerId;
    _renderInto(containerId);
  }

  // ── Re-speak handler (called from tile onclick) ──
  // Delegates to the global speak() function defined in the main app.
  function _speak(phrase) {
    if (typeof window.speak === 'function') {
      window.speak(phrase);
    } else if ('speechSynthesis' in window) {
      // Fallback if global speak isn't available
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(phrase);
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    }
  }

  // ── Expose ──
  return {
    add: add,
    getAll: getAll,
    clear: clear,
    renderBar: renderBar,
    _speak: _speak,  // exposed for onclick handlers in rendered HTML
    CSS: CSS          // exposed in case integrator wants to inspect/override
  };

})();
