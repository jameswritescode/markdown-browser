"use strict";
(() => {
  // src/core/theme.ts
  var FALLBACK_FG = [220, 220, 220];
  var FALLBACK_BG = [24, 24, 27];
  var FALLBACK_ANSI = {
    1: [224, 108, 117],
    2: [152, 195, 121],
    3: [229, 192, 123],
    4: [97, 175, 239],
    5: [198, 120, 221],
    6: [86, 182, 194]
  };
  function rgb(color, alpha) {
    const base = `${color[0]} ${color[1]} ${color[2]}`;
    return alpha === void 0 ? `rgb(${base})` : `rgb(${base} / ${alpha})`;
  }
  function toRgb(value, fallback) {
    return value && value.length >= 3 ? [value[0], value[1], value[2]] : fallback;
  }
  function themeVariables(theme, background) {
    const fg = toRgb(theme?.foreground, FALLBACK_FG);
    const bg = toRgb(theme?.background, FALLBACK_BG);
    const ansi = (i) => toRgb(theme?.ansi[i], FALLBACK_ANSI[i]);
    const page = background === "solid" ? rgb(bg) : "transparent";
    return {
      "--bg": page,
      "--fg": rgb(fg),
      "--muted": rgb(fg, 0.65),
      "--hairline": rgb(fg, 0.14),
      "--surface": rgb(fg, 0.06),
      "--surface-strong": rgb(fg, 0.12),
      "--accent": rgb(ansi(4)),
      "--note": rgb(ansi(4)),
      "--tip": rgb(ansi(2)),
      "--important": rgb(ansi(5)),
      "--warning": rgb(ansi(3)),
      "--caution": rgb(ansi(1)),
      "--syntax-keyword": rgb(ansi(5)),
      "--syntax-string": rgb(ansi(2)),
      "--syntax-number": rgb(ansi(3)),
      "--syntax-title": rgb(ansi(4)),
      "--syntax-type": rgb(ansi(6)),
      "--syntax-deletion": rgb(ansi(1)),
      "--pele-bg": page,
      "--pele-fg": rgb(fg),
      "--pele-muted": rgb(fg, 0.65),
      "--pele-line": rgb(fg, 0.7),
      "--pele-surface": rgb(fg, 0.08),
      "--pele-surface-alt": rgb(fg, 0.14),
      "--pele-border": rgb(fg, 0.3),
      "--pele-accent": rgb(ansi(4))
    };
  }

  // src/page/app.ts
  function applyTheme(start) {
    const set = (theme) => {
      for (const [name, value] of Object.entries(themeVariables(theme, start.background))) {
        document.documentElement.style.setProperty(name, value);
      }
    };
    set(window.pixel?.theme() ?? null);
    window.pixel?.onTheme(set);
  }
  async function main() {
    const start = await window.mdb.start();
    applyTheme(start);
    const scan = await window.mdb.scan(start.root);
    const app = document.getElementById("app");
    app.textContent = `mdb: ${scan.docs.length} docs in ${start.root}`;
  }
  void main();
})();
