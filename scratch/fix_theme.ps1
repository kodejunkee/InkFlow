$file = 'c:\Users\Jayce\Documents\App Projects\InkFlow\src\reader\readerHtml.ts'
$content = [System.IO.File]::ReadAllText($file)

$oldBlock = @'
    // ─── Theme application ───────────────────────────────────────────

      },
      sepia: {
        body: { background: '#F4ECD8', color: '#5B4636' },
        'a, a:link, a:visited': { color: '#8B6914' },
      },
      ocean: {
        body: { background: '#141E28', color: '#D1E0E8' },
        'a, a:link, a:visited': { color: '#5E93C5' },
      },
    };

    function applyTheme(cmd) {
      if (!rendition) return;

      // Update CSS variables
      var bgColors = { light: '#FFFFFF', dark: '#121212', sepia: '#F4ECD8', ocean: '#141E28' };
      document.body.style.background = bgColors[cmd.theme] || '#121212';
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
          'margin-top': '0.25em !important',
          'margin-bottom': '0.25em !important',
        },
        'img': {
          'max-width': '100% !important',
          'height': 'auto !important',
        },
      });
      rendition.themes.select(themeKey);
    }
'@

$newBlock = @'
    // ─── Theme application ───────────────────────────────────────────

    var currentThemeCSS = '';

    function injectThemeStyle(doc, css) {
      if (!doc) return;
      var existing = doc.getElementById('inkflow-theme');
      if (existing) {
        existing.textContent = css;
      } else {
        var style = doc.createElement('style');
        style.id = 'inkflow-theme';
        style.textContent = css;
        doc.head.appendChild(style);
      }
    }

    function applyTheme(cmd) {
      if (!rendition) return;

      var bgColors = { light: '#FFFFFF', dark: '#121212', sepia: '#F4ECD8', ocean: '#141E28' };
      var textColors = { light: '#1A1A1A', dark: '#CCCCCC', sepia: '#5B4636', ocean: '#D1E0E8' };
      var linkColors = { light: '#3D5AFE', dark: '#809FFF', sepia: '#8B6914', ocean: '#5E93C5' };

      var bg = bgColors[cmd.theme] || '#121212';
      var text = textColors[cmd.theme] || '#CCCCCC';
      var link = linkColors[cmd.theme] || '#809FFF';

      // Update outer container
      document.body.style.background = bg;
      document.getElementById('reader').style.padding = '0 ' + cmd.margins + 'px';

      // Build a single CSS string for injection into epub iframes
      var css = 'body { background: ' + bg + ' !important; color: ' + text + ' !important; '
        + 'font-size: ' + cmd.fontSize + 'px !important; '
        + 'line-height: ' + cmd.lineHeight + ' !important; '
        + 'padding: 0 !important; margin: 0 !important; }\n'
        + 'a, a:link, a:visited { color: ' + link + ' !important; }\n'
        + 'p, div, span, li { font-size: inherit !important; line-height: inherit !important; '
        + 'margin-top: 0.25em !important; margin-bottom: 0.25em !important; }\n'
        + 'img { max-width: 100% !important; height: auto !important; }';

      // Store for newly rendered sections
      currentThemeCSS = css;

      // Inject/update a single style tag in every currently rendered iframe
      try {
        rendition.getContents().forEach(function(contents) {
          injectThemeStyle(contents.document, css);
        });
      } catch(e) {
        console.warn('applyTheme getContents error:', e);
      }
    }
'@

# Normalize line endings for matching
$contentNorm = $content -replace "`r`n", "`n"
$oldNorm = $oldBlock -replace "`r`n", "`n"
$newNorm = $newBlock -replace "`r`n", "`n"

if ($contentNorm.Contains($oldNorm)) {
    $result = $contentNorm.Replace($oldNorm, $newNorm)
    # Restore original CRLF
    $result = $result -replace "`n", "`r`n"
    [System.IO.File]::WriteAllText($file, $result)
    Write-Host "SUCCESS: Replaced applyTheme block"
} else {
    Write-Host "FAIL: Old block not found"
    # Debug: try to find the first line
    $firstLine = "// ─── Theme application"
    $idx = $contentNorm.IndexOf($firstLine)
    Write-Host "Index of theme comment: $idx"
}
