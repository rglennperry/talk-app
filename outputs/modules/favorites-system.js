/**
 * FavoritesSystem — Favorites module for Gordon AAC Communicator
 *
 * Self-contained: includes CSS injection, localStorage persistence,
 * long-press gesture handling, and rendering.
 *
 * Usage: Load via <script src="modules/favorites-system.js"></script>
 *        or inline the contents into the main HTML.
 *        Exposes global `FavoritesSystem` object.
 */
(function () {
  'use strict';

  // ── Constants ──
  var STORAGE_KEY = 'gordon-favorites';
  var LONG_PRESS_MS = 500;
  var TOAST_DURATION_MS = 1800;
  var CSS_INJECTED_FLAG = '__favorites_css_injected';

  // ── CSS ──
  var CSS = `
/* ── Favorites System Styles ── */

/* Favorite badge on tiles in any category grid */
.fav-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 0.85rem;
  line-height: 1;
  color: #e94560;
  pointer-events: none;
  filter: drop-shadow(0 0 2px rgba(233,69,96,0.6));
  z-index: 2;
}

/* Make tiles position-relative so badge can anchor */
.tile {
  position: relative;
}

/* ── Toast notification ── */
.fav-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--surface, #16213e);
  color: var(--text, #ffffff);
  border: 2px solid var(--accent, #e94560);
  border-radius: var(--radius, 16px);
  padding: 12px 24px;
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.fav-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* ── Heart burst animation (on long-press add) ── */
.fav-heart-burst {
  position: fixed;
  pointer-events: none;
  z-index: 9998;
  font-size: 2.4rem;
  animation: fav-burst 0.7s ease-out forwards;
}
@keyframes fav-burst {
  0%   { opacity: 1; transform: scale(0.5); }
  50%  { opacity: 1; transform: scale(1.4); }
  100% { opacity: 0; transform: scale(1.8) translateY(-30px); }
}

/* ── Favorites grid tab styling ── */
.cat-favorites .tile {
  background: #2c1a3e;
  border: 2px solid transparent;
}
.cat-favorites .tile:active {
  border-color: var(--accent, #e94560);
}

/* Remove-mode shake on long-press in favorites tab */
.fav-tile-removing {
  animation: fav-shake 0.3s ease-in-out;
}
@keyframes fav-shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-4px) rotate(-1deg); }
  75%      { transform: translateX(4px) rotate(1deg); }
}

/* ── Confirmation overlay ── */
.fav-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}
.fav-confirm-dialog {
  background: var(--surface, #16213e);
  border: 2px solid var(--accent, #e94560);
  border-radius: var(--radius, 16px);
  padding: 28px 32px;
  text-align: center;
  max-width: 340px;
  width: 85%;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.fav-confirm-dialog p {
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 20px;
  line-height: 1.4;
  color: var(--text, #ffffff);
}
.fav-confirm-dialog .phrase-preview {
  font-size: 1rem;
  color: var(--text-dim, #a0a0b8);
  margin-bottom: 20px;
}
.fav-confirm-btns {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.fav-confirm-btns button {
  flex: 1;
  padding: 14px 0;
  font-size: 1.1rem;
  font-weight: 700;
  border: none;
  border-radius: var(--radius, 16px);
  cursor: pointer;
  color: #fff;
  min-height: 52px;
}
.fav-confirm-btns .btn-cancel {
  background: var(--card, #0f3460);
}
.fav-confirm-btns .btn-remove {
  background: var(--danger, #e74c3c);
}

/* ── Empty-state message ── */
.fav-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-dim, #a0a0b8);
  font-size: 1.15rem;
  line-height: 1.6;
}
.fav-empty .hint {
  font-size: 0.95rem;
  margin-top: 12px;
  opacity: 0.7;
}

/* ── Long-press visual feedback (tile dims slightly) ── */
.fav-pressing {
  opacity: 0.7 !important;
  transition: opacity 0.15s ease;
}
`;

  // ── Inject CSS ──
  function injectCSS() {
    if (window[CSS_INJECTED_FLAG]) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    style.id = 'favorites-system-css';
    document.head.appendChild(style);
    window[CSS_INJECTED_FLAG] = true;
  }

  // ── Storage helpers ──
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      // Storage full or unavailable — silent fail
    }
  }

  // ── Toast ──
  var _toastEl = null;
  var _toastTimer = null;

  function ensureToast() {
    if (_toastEl) return _toastEl;
    _toastEl = document.createElement('div');
    _toastEl.className = 'fav-toast';
    document.body.appendChild(_toastEl);
    return _toastEl;
  }

  function showToast(msg) {
    var el = ensureToast();
    clearTimeout(_toastTimer);
    el.textContent = msg;
    // Force reflow for re-triggering animation
    el.classList.remove('visible');
    void el.offsetWidth;
    el.classList.add('visible');
    _toastTimer = setTimeout(function () {
      el.classList.remove('visible');
    }, TOAST_DURATION_MS);
  }

  // ── Heart burst animation ──
  function heartBurst(x, y) {
    var el = document.createElement('div');
    el.className = 'fav-heart-burst';
    el.textContent = '\u2764\uFE0F'; // red heart
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    el.addEventListener('animationend', function () {
      el.remove();
    });
  }

  // ── Confirmation dialog ──
  function confirmRemove(phrase, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'fav-confirm-overlay';

    // Find the favorite for display
    var favs = load();
    var fav = null;
    for (var i = 0; i < favs.length; i++) {
      if (favs[i].phrase === phrase) { fav = favs[i]; break; }
    }
    var displayLabel = fav ? (fav.emoji + ' ' + fav.label) : phrase;

    overlay.innerHTML =
      '<div class="fav-confirm-dialog">' +
        '<p>Remove from favorites?</p>' +
        '<div class="phrase-preview">' + escapeHTML(displayLabel) + '</div>' +
        '<div class="fav-confirm-btns">' +
          '<button class="btn-cancel">Keep</button>' +
          '<button class="btn-remove">Remove</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var cancel = overlay.querySelector('.btn-cancel');
    var remove = overlay.querySelector('.btn-remove');

    cancel.addEventListener('click', function () {
      overlay.remove();
    });
    cancel.addEventListener('touchend', function (e) {
      e.preventDefault();
      overlay.remove();
    });

    remove.addEventListener('click', function () {
      overlay.remove();
      onConfirm();
    });
    remove.addEventListener('touchend', function (e) {
      e.preventDefault();
      overlay.remove();
      onConfirm();
    });

    // Tap outside dialog to cancel
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ── Utility ──
  function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Long-press handler (attaches to tiles in any grid) ──
  // Returns a cleanup function to remove listeners.
  function attachLongPress(tileEl, opts) {
    var timer = null;
    var startX = 0;
    var startY = 0;
    var fired = false;
    var MOVE_THRESHOLD = 10;

    function onStart(e) {
      fired = false;
      var touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;

      timer = setTimeout(function () {
        fired = true;
        tileEl.classList.remove('fav-pressing');
        if (opts.onLongPress) {
          opts.onLongPress(touch.clientX, touch.clientY);
        }
      }, LONG_PRESS_MS);

      tileEl.classList.add('fav-pressing');
    }

    function onMove(e) {
      if (!timer) return;
      var touch = e.touches ? e.touches[0] : e;
      var dx = Math.abs(touch.clientX - startX);
      var dy = Math.abs(touch.clientY - startY);
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        clearTimeout(timer);
        timer = null;
        tileEl.classList.remove('fav-pressing');
      }
    }

    function onEnd(e) {
      clearTimeout(timer);
      timer = null;
      tileEl.classList.remove('fav-pressing');
      // If long-press fired, prevent the normal tap/click from also firing
      if (fired) {
        e.preventDefault();
        e.stopPropagation();
        fired = false;
      }
    }

    tileEl.addEventListener('touchstart', onStart, { passive: true });
    tileEl.addEventListener('touchmove', onMove, { passive: true });
    tileEl.addEventListener('touchend', onEnd, false);
    tileEl.addEventListener('touchcancel', onEnd, false);

    // Mouse fallback for testing in desktop browser
    tileEl.addEventListener('mousedown', onStart);
    tileEl.addEventListener('mousemove', onMove);
    tileEl.addEventListener('mouseup', onEnd);

    return function cleanup() {
      clearTimeout(timer);
      tileEl.removeEventListener('touchstart', onStart);
      tileEl.removeEventListener('touchmove', onMove);
      tileEl.removeEventListener('touchend', onEnd);
      tileEl.removeEventListener('touchcancel', onEnd);
      tileEl.removeEventListener('mousedown', onStart);
      tileEl.removeEventListener('mousemove', onMove);
      tileEl.removeEventListener('mouseup', onEnd);
    };
  }

  // Track cleanup functions for long-press listeners on category tiles
  var _categoryCleanups = [];

  // ── Public API ──

  var FavoritesSystem = {

    /** CSS string — available for manual injection if needed */
    CSS: CSS,

    /**
     * Initialize: inject CSS. Call once at startup.
     */
    init: function () {
      injectCSS();
    },

    /**
     * Add a phrase to favorites.
     * @param {string} phrase - The spoken phrase
     * @param {string} emoji  - Display emoji
     * @param {string} label  - Short display label
     * @returns {boolean} true if added, false if already exists
     */
    add: function (phrase, emoji, label) {
      var favs = load();
      for (var i = 0; i < favs.length; i++) {
        if (favs[i].phrase === phrase) return false;
      }
      favs.push({
        phrase: phrase,
        emoji: emoji || '',
        label: label || phrase,
        addedAt: new Date().toISOString()
      });
      save(favs);
      return true;
    },

    /**
     * Remove a phrase from favorites.
     * @param {string} phrase
     * @returns {boolean} true if removed, false if not found
     */
    remove: function (phrase) {
      var favs = load();
      var newFavs = [];
      var found = false;
      for (var i = 0; i < favs.length; i++) {
        if (favs[i].phrase === phrase) {
          found = true;
        } else {
          newFavs.push(favs[i]);
        }
      }
      if (found) save(newFavs);
      return found;
    },

    /**
     * Get all favorites.
     * @returns {Array} Array of {phrase, emoji, label, addedAt}
     */
    getAll: function () {
      return load();
    },

    /**
     * Check if a phrase is a favorite.
     * @param {string} phrase
     * @returns {boolean}
     */
    isFavorite: function (phrase) {
      var favs = load();
      for (var i = 0; i < favs.length; i++) {
        if (favs[i].phrase === phrase) return true;
      }
      return false;
    },

    /**
     * Toggle a phrase as favorite.
     * @param {string} phrase
     * @param {string} emoji
     * @param {string} label
     * @returns {boolean} true if now favorited, false if removed
     */
    toggle: function (phrase, emoji, label) {
      if (FavoritesSystem.isFavorite(phrase)) {
        FavoritesSystem.remove(phrase);
        return false;
      } else {
        FavoritesSystem.add(phrase, emoji, label);
        return true;
      }
    },

    /**
     * Render the favorites grid into a container.
     *
     * @param {string} containerId - ID of the container element (e.g. 'grid')
     * @param {Function} speakFn   - Function to call with (phrase) on tile tap
     */
    renderTab: function (containerId, speakFn) {
      var container = document.getElementById(containerId);
      if (!container) return;

      container.className = 'grid cat-favorites';

      var favs = load();

      if (favs.length === 0) {
        container.innerHTML =
          '<div class="fav-empty" style="grid-column: 1 / -1;">' +
            '<div style="font-size: 2.5rem; margin-bottom: 12px;">&#9733;</div>' +
            '<div>No favorites yet</div>' +
            '<div class="hint">Long-press any tile to add it here</div>' +
          '</div>';
        return;
      }

      container.innerHTML = '';

      favs.forEach(function (fav) {
        var tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('role', 'button');
        tile.setAttribute('aria-label', fav.phrase);

        tile.innerHTML =
          '<span class="fav-badge">&#9733;</span>' +
          '<span class="emoji">' + fav.emoji + '</span>' +
          '<span class="label">' + escapeHTML(fav.label) + '</span>';

        // Tap to speak
        tile.addEventListener('click', function () {
          speakFn(fav.phrase);
          tile.classList.add('spoken');
          setTimeout(function () { tile.classList.remove('spoken'); }, 600);
        });

        // Long-press to remove (with confirmation)
        attachLongPress(tile, {
          onLongPress: function () {
            tile.classList.add('fav-tile-removing');
            setTimeout(function () {
              tile.classList.remove('fav-tile-removing');
            }, 300);

            confirmRemove(fav.phrase, function () {
              FavoritesSystem.remove(fav.phrase);
              showToast('Removed from favorites');
              // Re-render
              FavoritesSystem.renderTab(containerId, speakFn);
            });
          }
        });

        container.appendChild(tile);
      });
    },

    /**
     * Attach long-press-to-favorite behavior to all tiles in a grid.
     * Call this after renderGrid() or whenever the grid re-renders.
     *
     * @param {string} gridId    - ID of the grid container (e.g. 'grid')
     * @param {Function} getTileData - Function(tileEl) returning {phrase, emoji, label} or null
     */
    attachToGrid: function (gridId, getTileData) {
      // Clean up previous listeners
      _categoryCleanups.forEach(function (fn) { fn(); });
      _categoryCleanups = [];

      var grid = document.getElementById(gridId);
      if (!grid) return;

      var tiles = grid.querySelectorAll('.tile');
      tiles.forEach(function (tile) {
        var data = getTileData(tile);
        if (!data) return;

        // Add or update the star badge
        FavoritesSystem.updateBadge(tile, data.phrase);

        var cleanup = attachLongPress(tile, {
          onLongPress: function (cx, cy) {
            var wasAdded = FavoritesSystem.toggle(data.phrase, data.emoji, data.label);
            if (wasAdded) {
              heartBurst(cx, cy);
              showToast('Added to favorites');
            } else {
              showToast('Removed from favorites');
            }
            // Update badge on this tile
            FavoritesSystem.updateBadge(tile, data.phrase);
          }
        });

        _categoryCleanups.push(cleanup);
      });
    },

    /**
     * Add or remove the star badge on a single tile based on favorite status.
     *
     * @param {HTMLElement} tileEl
     * @param {string} phrase
     */
    updateBadge: function (tileEl, phrase) {
      var existing = tileEl.querySelector('.fav-badge');
      if (FavoritesSystem.isFavorite(phrase)) {
        if (!existing) {
          var badge = document.createElement('span');
          badge.className = 'fav-badge';
          badge.innerHTML = '&#9733;';
          tileEl.appendChild(badge);
        }
      } else {
        if (existing) existing.remove();
      }
    },

    /**
     * Create and return a tab element for the favorites category.
     * The caller should insert this into the #tabs bar.
     *
     * @param {Function} onActivate - Called when the tab is clicked.
     *                                Receives the tab element as argument.
     * @returns {HTMLElement} The tab div element
     */
    createTab: function (onActivate) {
      var tab = document.createElement('div');
      tab.className = 'tab';
      tab.id = 'tab-favorites';
      tab.textContent = '\u2605 Favorites';

      tab.addEventListener('click', function () {
        // Deactivate all tabs, activate this one
        document.querySelectorAll('.tab').forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');

        if (onActivate) onActivate(tab);
      });

      return tab;
    },

    /**
     * Get the count of favorites (useful for badge counts on the tab).
     * @returns {number}
     */
    count: function () {
      return load().length;
    },

    /**
     * Save the current message-bar phrase as a favorite.
     * Useful for "save composed phrase" button.
     *
     * @param {string} phrase - The composed phrase
     * @param {string} [emoji='💬'] - Emoji for the tile
     * @returns {boolean} true if added
     */
    savePhrase: function (phrase, emoji) {
      if (!phrase || phrase.trim() === '') return false;
      phrase = phrase.trim();
      // Generate a short label from the phrase (first 3 words)
      var words = phrase.split(/\s+/);
      var label = words.slice(0, 3).join(' ');
      if (words.length > 3) label += '...';
      return FavoritesSystem.add(phrase, emoji || '\uD83D\uDCAC', label);
    },

    /**
     * Export all favorites as JSON string (for backup).
     * @returns {string}
     */
    exportJSON: function () {
      return JSON.stringify(load(), null, 2);
    },

    /**
     * Import favorites from JSON string (merges, does not overwrite).
     * @param {string} json
     * @returns {number} count of newly added items
     */
    importJSON: function (json) {
      try {
        var imported = JSON.parse(json);
        if (!Array.isArray(imported)) return 0;
        var count = 0;
        imported.forEach(function (item) {
          if (item.phrase && FavoritesSystem.add(item.phrase, item.emoji, item.label)) {
            count++;
          }
        });
        return count;
      } catch (e) {
        return 0;
      }
    }
  };

  // ── Auto-init on load ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      FavoritesSystem.init();
    });
  } else {
    FavoritesSystem.init();
  }

  // ── Expose globally ──
  window.FavoritesSystem = FavoritesSystem;

})();
