/**
 * InkFlow Reader HTML Generator
 *
 * Generates the complete HTML page for the epub.js WebView reader.
 * epub.js is inlined for fully offline operation.
 *
 * The generated HTML:
 * - Initializes epub.js with scrolled-doc flow
 * - Handles chapter-boundary detection for infinite scrolling
 * - Communicates with React Native via postMessage / handleReaderCommand
 * - Applies reader themes (light/dark/sepia)
 * - Reports location/progress changes
 * - Supports text selection for highlights/bookmarks
 */

import { JSZIP_SOURCE } from './jszipBundle';
import { EPUBJS_SOURCE } from './epubjsBundle';

interface ReaderThemeConfig {
  background: string;
  text: string;
  link: string;
  selectionBg: string;
}

interface GenerateOptions {
  fontSize: number;
  lineHeight: number;
  margins: number;
  theme: ReaderThemeConfig;
}

const DEFAULT_OPTIONS: GenerateOptions = {
  fontSize: 18,
  lineHeight: 1.8,
  margins: 16,
  theme: {
    background: '#121212',
    text: '#CCCCCC',
    link: '#809FFF',
    selectionBg: 'rgba(128, 159, 255, 0.25)',
  },
};

export function generateReaderHtml(options: Partial<GenerateOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { fontSize, lineHeight, margins, theme } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>InkFlow Reader</title>
  <style>
    /* ─── Reset & base ──────────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${theme.background};
      color: ${theme.text};
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      -webkit-text-size-adjust: 100%;
      -webkit-tap-highlight-color: transparent;
    }

    /* ─── Reader container ──────────────────────────────────────────── */
    #reader {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      padding: 0 ${margins}px;
    }

    /* ─── epub.js content overrides ──────────────────────────────────── */
    #reader iframe {
      border: none !important;
    }
    
    /* Fix continuous scroll jump loops */
    #reader {
      overflow-anchor: none !important;
    }
    .epub-container {
      overflow-anchor: none !important;
    }
    .epub-view {
      overflow-anchor: none !important;
      min-height: 100vh;
    }

    /* ─── Selection styling ──────────────────────────────────────────── */
    ::selection {
      background: ${theme.selectionBg};
    }

    /* ─── Loading state ──────────────────────────────────────────────── */
    #loading {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${theme.background};
      z-index: 100;
      transition: opacity 0.3s ease;
    }
    #loading.hidden { opacity: 0; pointer-events: none; }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid rgba(128,128,128,0.2);
      border-top-color: ${theme.link};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── Chapter header injection (CSS-only to avoid CFI corruption) ── */
    body[data-inkflow-chapter]::before {
      content: attr(data-inkflow-chapter);
      display: block;
      text-align: center;
      margin: 1.5em 0 1em 0;
      padding-bottom: 0.5em;
      border-bottom: 1px solid rgba(128,128,128,0.25);
      font-size: 1.3em;
      font-weight: 600;
      opacity: 0.85;
      letter-spacing: 0.02em;
    }

    /* ─── Chapter separator ──────────────────────────────────────────── */
    .chapter-separator {
      text-align: center;
      padding: 24px 0;
      color: rgba(128,128,128,0.4);
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div id="loading"><div class="spinner"></div></div>
  <div id="reader"></div>

  <!-- JSZip required by epub.js for EPUB decompression -->
  <script>${JSZIP_SOURCE}</script>

  <!-- epub.js inlined for offline operation -->
  <script>${EPUBJS_SOURCE}</script>

  <script>
    // ═══════════════════════════════════════════════════════════════════
    // InkFlow Reader Engine
    // ═══════════════════════════════════════════════════════════════════

    let book = null;
    let rendition = null;
    let currentSection = null;
    let isReady = false;

    // ─── RN Bridge ───────────────────────────────────────────────────

    function sendToRN(message) {
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      } catch (e) {
        console.error('[Reader] sendToRN error:', e);
      }
    }

    // ─── Command handler (called from RN via injectedJavaScript) ────

    window.handleReaderCommand = function(cmd) {
      try {
        switch (cmd.type) {
          case 'loadBook':
            loadBook(cmd.uri, cmd.initialCfi);
            break;
          case 'goToCfi':
            if (rendition) {
              // CFI ranges (from highlights) look like epubcfi(base,startOffset,endOffset)
              // Extract just the start CFI so we navigate to the beginning of the range
              var targetCfi = cmd.cfi;
              if (targetCfi && targetCfi.indexOf(',') !== -1) {
                // Range CFI: epubcfi(/6/4[id]!/4/2, /1:0, /3:50)
                // Start = base + startOffset = epubcfi(/6/4[id]!/4/2/1:0)
                var raw = targetCfi;
                if (raw.indexOf('epubcfi(') === 0) raw = raw.substring(8);
                if (raw.charAt(raw.length - 1) === ')') raw = raw.substring(0, raw.length - 1);
                var parts = raw.split(',');
                if (parts.length >= 2) {
                  targetCfi = 'epubcfi(' + parts[0].trim() + parts[1].trim() + ')';
                }
              }
              try {
                rendition.display(targetCfi);
              } catch (e) {
                console.warn('[Reader] Failed to navigate to CFI:', targetCfi, e);
              }
            }
            break;
          case 'goToChapter':
            if (rendition) goToChapter(cmd.href);
            break;
          case 'nextPage':
            if (rendition) rendition.next();
            break;
          case 'prevPage':
            if (rendition) rendition.prev();
            break;
          case 'applyTheme':
            applyTheme(cmd);
            break;
          case 'addHighlight':
            addHighlight(cmd.cfiRange, cmd.color, cmd.id);
            break;
          case 'removeHighlight':
            removeHighlight(cmd.cfiRange, cmd.id);
            break;
          case 'clearSelection':
            if (rendition) rendition.manager && window.getSelection().removeAllRanges();
            break;
          case 'getBookmarkContext':
            getBookmarkContext();
            break;
          case 'restoreHighlights':
            restoreHighlights(cmd.highlights);
            break;
        }
      } catch (e) {
        sendToRN({ type: 'error', message: e.message, stack: e.stack });
      }
    };

    // ─── Book loading ────────────────────────────────────────────────

    async function loadBook(uri, initialCfi) {
      try {
        // Clean up previous book
        if (rendition) {
          rendition.destroy();
          rendition = null;
        }
        if (book) {
          book.destroy();
          book = null;
        }

        document.getElementById('loading').classList.remove('hidden');

        book = ePub(uri);

        rendition = book.renderTo('reader', {
          flow: 'scrolled-doc',
          width: '100%',
          height: '100%',
          snap: false,
          manager: 'continuous',
          spread: 'none',
        });

        // Apply initial theme
        applyRenditionTheme();

        // ── Location/progress tracking ──────────────────────────────
        rendition.on('relocated', function(location) {
          if (!location || !location.start) return;

          const progress = book.locations
            ? location.start.percentage || 0
            : 0;

          const chapterTitle = getChapterTitle(location.start.href);
          const chapterIndex = getChapterIndex(location.start.href);

          sendToRN({
            type: 'locationChanged',
            cfi: location.start.cfi,
            progress: progress,
            chapterIndex: chapterIndex,
            chapterTitle: chapterTitle,
          });
        });

        // ── Text selection ──────────────────────────────────────────
        rendition.on('selected', function(cfiRange, contents) {
          const range = rendition.getRange(cfiRange);
          if (!range) return;

          const selectedText = range.toString().trim();
          if (!selectedText) return;

          const rect = range.getBoundingClientRect();
          const chapterTitle = getChapterTitle(
            rendition.currentLocation()?.start?.href || ''
          );

          sendToRN({
            type: 'textSelected',
            cfiRange: cfiRange,
            selectedText: selectedText,
            chapterTitle: chapterTitle,
            rect: {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
            },
          });
        });

        // ── Chapter header injection & Scroll Fixes ──────────────────
        // For books that don't have visible chapter titles in the HTML,
        // inject a styled heading at the top of each chapter.
        rendition.hooks.content.register(function(contents) {
          try {
            var doc = contents.document;
            if (!doc || !doc.body) return;

            // Disable scroll anchoring to prevent infinite scroll loops in continuous mode
            doc.documentElement.style.overflowAnchor = "none";
            doc.body.style.overflowAnchor = "none";

            // Check if the chapter already has a visible heading
            var firstChild = doc.body.firstElementChild;
            var hasHeading = false;
            if (firstChild) {
              var tag = firstChild.tagName;
              if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
                hasHeading = true;
              }
              // Also check if first child contains a heading as its first child
              if (!hasHeading && firstChild.firstElementChild) {
                tag = firstChild.firstElementChild.tagName;
                if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
                  hasHeading = true;
                }
              }
            }

            if (hasHeading) return;

            // Look up this chapter's title from the TOC
            var sectionHref = contents.sectionIndex !== undefined
              ? (book.spine.get(contents.sectionIndex) || {}).href
              : '';
            if (!sectionHref && contents.cfiBase) {
              // Fallback: try to find href from spine items
              var items = book.spine.items || book.spine.spineItems || [];
              for (var si = 0; si < items.length; si++) {
                if (items[si].cfiBase === contents.cfiBase) {
                  sectionHref = items[si].href;
                  break;
                }
              }
            }

            var chTitle = sectionHref ? getChapterTitle(sectionHref) : '';
            if (!chTitle) return;

            // Use CSS ::before to inject the heading visually without mutating DOM elements!
            // Mutating the DOM (e.g. insertBefore) shifts the element indices and permanently corrupts CFIs.
            doc.body.setAttribute('data-inkflow-chapter', chTitle);
          } catch (e) {
            // Non-fatal — skip header injection
          }
        });

        // ── Display ─────────────────────────────────────────────────
        if (initialCfi) {
          await rendition.display(initialCfi);
        } else {
          await rendition.display();
        }

        // ── TOC ─────────────────────────────────────────────────────
        var toc = flattenToc(book.navigation.toc);
        sendToRN({ type: 'tocLoaded', toc: toc });

        // ── Tap detection ───────────────────────────────────────────
        rendition.on('click', function(e) {
          // Normalise tap position
          var x = e.clientX / window.innerWidth;
          var y = e.clientY / window.innerHeight;
          sendToRN({ type: 'tap', x: x, y: y });
        });

        // ── Ready ───────────────────────────────────────────────────
        isReady = true;
        document.getElementById('loading').classList.add('hidden');
        sendToRN({ type: 'ready' });

        // ── Generate locations in background (non-blocking) ─────────
        // This runs AFTER the book is visible so large EPUBs open instantly.
        // Progress will read 0% until generation completes.
        book.locations.generate(1600).catch(function(e) {
          console.warn('[Reader] Location generation failed:', e);
        });

      } catch (e) {
        sendToRN({ type: 'error', message: e.message || 'Failed to load book', stack: e.stack });
      }
    }

    // ─── Theme application ───────────────────────────────────────────

    const THEME_STYLES = {
      light: {
        body: { background: '#FFFFFF', color: '#1A1A1A' },
        'a, a:link, a:visited': { color: '#3D5AFE' },
      },
      dark: {
        body: { background: '#121212', color: '#CCCCCC' },
        'a, a:link, a:visited': { color: '#809FFF' },
      },
      sepia: {
        body: { background: '#F4ECD8', color: '#5B4636' },
        'a, a:link, a:visited': { color: '#8B6914' },
      },
    };

    function applyTheme(cmd) {
      if (!rendition) return;

      // Update CSS variables
      document.body.style.background = cmd.theme === 'light' ? '#FFFFFF'
        : cmd.theme === 'sepia' ? '#F4ECD8' : '#121212';
      document.getElementById('reader').style.padding = '0 ' + cmd.margins + 'px';

      // Register and apply the theme to epub.js rendition
      const themeKey = cmd.theme || 'dark';
      const themeStyle = THEME_STYLES[themeKey] || THEME_STYLES.dark;

      rendition.themes.register(themeKey, {
        ...themeStyle,
        body: {
          ...themeStyle.body,
          'font-size': cmd.fontSize + 'px !important',
          'line-height': cmd.lineHeight + ' !important',
          'padding': '0 !important',
          'margin': '0 !important',
        },
        'p, div, span, li': {
          'font-size': 'inherit !important',
          'line-height': 'inherit !important',
        },
        'img': {
          'max-width': '100% !important',
          'height': 'auto !important',
        },
      });
      rendition.themes.select(themeKey);
    }

    function applyRenditionTheme() {
      if (!rendition) return;
      // Apply default dark theme on initial load
      rendition.themes.register('default', {
        body: {
          background: '${theme.background}',
          color: '${theme.text}',
          'font-size': '${fontSize}px !important',
          'line-height': '${lineHeight} !important',
          'padding': '0 !important',
          'margin': '0 !important',
        },
        'a, a:link, a:visited': { color: '${theme.link}' },
        'p, div, span, li': {
          'font-size': 'inherit !important',
          'line-height': 'inherit !important',
        },
        'img': {
          'max-width': '100% !important',
          'height': 'auto !important',
        },
      });
      rendition.themes.select('default');
    }

    // ─── Highlights ──────────────────────────────────────────────────

    const highlightMap = new Map();

    function addHighlight(cfiRange, color, id) {
      if (!rendition) return;

      const colorMap = {
        yellow:  'rgba(255, 235, 59, 0.35)',
        green:   'rgba(76, 175, 80, 0.35)',
        blue:    'rgba(66, 165, 245, 0.35)',
        pink:    'rgba(240, 98, 146, 0.35)',
        orange:  'rgba(255, 167, 38, 0.35)',
      };
      const bgColor = colorMap[color] || colorMap.yellow;

      try {
        rendition.annotations.highlight(
          cfiRange,
          { id: id },
          function(e) {
            // Highlight clicked — notify RN
            sendToRN({
              type: 'textSelected',
              cfiRange: cfiRange,
              selectedText: '',
              chapterTitle: '',
              rect: { x: e.clientX, y: e.clientY, width: 0, height: 0 },
            });
          },
          'hl-' + id,
          { 'fill': bgColor, 'fill-opacity': '1', 'mix-blend-mode': 'multiply' }
        );
        highlightMap.set(id, cfiRange);
      } catch (e) {
        console.warn('[Reader] Failed to add highlight for CFI:', cfiRange, e);
      }
    }

    function removeHighlight(cfiRange, id) {
      if (!rendition) return;
      rendition.annotations.remove(cfiRange, 'highlight');
      highlightMap.delete(id);
    }

    function restoreHighlights(highlights) {
      if (!rendition || !highlights) return;
      highlights.forEach(function(h) {
        addHighlight(h.cfiRange, h.color, h.id);
      });
    }

    // ─── Bookmark context ────────────────────────────────────────────

    async function getBookmarkContext() {
      if (!rendition || !book) return;
      var loc = rendition.currentLocation();
      if (!loc || !loc.start) return;

      var contextText = '';
      try {
        var range = await book.getRange(loc.start.cfi);
        if (range && range.startContainer) {
          var node = range.startContainer;
          // If it's a text node, get its parent element (like a <p>)
          if (node.nodeType === 3) {
            node = node.parentNode;
          }
          var rawText = node.textContent || node.innerText || '';
          contextText = rawText.replace(/\s+/g, ' ').trim().substring(0, 100);
        }
      } catch (e) {
        // Fallback
      }

      sendToRN({
        type: 'bookmarkContext',
        cfi: loc.start.cfi,
        chapterTitle: getChapterTitle(loc.start.href),
        contextText: contextText,
      });
    }

    // ─── TOC helpers ─────────────────────────────────────────────────

    function flattenToc(toc, depth) {
      depth = depth || 0;
      var result = [];
      if (!toc) return result;

      for (var i = 0; i < toc.length; i++) {
        var item = toc[i];
        result.push({
          id: item.id || ('toc-' + i),
          href: item.href,
          label: (item.label || '').trim(),
          subitems: item.subitems ? flattenToc(item.subitems, depth + 1) : [],
        });
      }
      return result;
    }

    function getChapterTitle(href) {
      if (!book || !book.navigation || !href) return '';
      var toc = book.navigation.toc;
      var hrefBase = href.split('#')[0];
      // Exact match first
      for (var i = 0; i < toc.length; i++) {
        if (toc[i].href && hrefBase.indexOf(toc[i].href.split('#')[0]) !== -1) {
          return (toc[i].label || '').trim();
        }
      }
      // Fuzzy: match by filename only
      var hrefFile = hrefBase.split('/').pop();
      for (var j = 0; j < toc.length; j++) {
        var tocFile = (toc[j].href || '').split('#')[0].split('/').pop();
        if (tocFile && tocFile === hrefFile) {
          return (toc[j].label || '').trim();
        }
      }
      return '';
    }

    function getChapterIndex(href) {
      if (!book || !book.spine || !href) return 0;
      var items = book.spine.items || book.spine.spineItems || [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].href && href.indexOf(items[i].href) !== -1) {
          return i;
        }
      }
      return 0;
    }

    // Fuzzy chapter navigation — tries exact href, then filename-only, then spine match
    function goToChapter(href) {
      if (!rendition || !book) return;

      // 1. Try exact href
      rendition.display(href).catch(function() {
        // 2. Try without fragment
        var hrefNoFrag = href.split('#')[0];
        rendition.display(hrefNoFrag).catch(function() {
          // 3. Try matching by filename against spine
          var fileName = hrefNoFrag.split('/').pop();
          var items = book.spine.items || book.spine.spineItems || [];
          for (var i = 0; i < items.length; i++) {
            var spineFile = (items[i].href || '').split('/').pop();
            if (spineFile === fileName) {
              rendition.display(items[i].href);
              return;
            }
          }
        });
      });
    }

    // ─── Error handling ──────────────────────────────────────────────

    window.onerror = function(msg, src, line, col, err) {
      sendToRN({
        type: 'error',
        message: msg + ' (' + src + ':' + line + ')',
        stack: err ? err.stack : '',
      });
    };

    // Notify RN that the page is loaded and ready for commands
    sendToRN({ type: 'contentLoaded', totalPages: 0 });
  </script>
</body>
</html>`;
}
