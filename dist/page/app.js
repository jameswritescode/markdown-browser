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

  // src/core/filter.ts
  var WORD_BREAK = /[\s/._-]/;
  function matchFrom(text, lower, query, start) {
    const positions = [];
    let at = start;
    for (const ch of query) {
      const found = lower.indexOf(ch, at);
      if (found === -1) return null;
      positions.push(found);
      at = found + 1;
    }
    let score = 0;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      score += 1;
      if (pos === 0 || WORD_BREAK.test(text[pos - 1])) score += 8;
      if (i > 0 && positions[i - 1] === pos - 1) score += 5;
      else if (i > 0) score -= Math.min(pos - positions[i - 1] - 1, 5);
    }
    return { score, ranges: toRanges(positions) };
  }
  function toRanges(positions) {
    const ranges = [];
    for (const pos of positions) {
      const last = ranges[ranges.length - 1];
      if (last && last[1] === pos) last[1] = pos + 1;
      else ranges.push([pos, pos + 1]);
    }
    return ranges;
  }
  function matchField(text, query) {
    const lower = text.toLowerCase();
    let best = null;
    for (let start = lower.indexOf(query[0]); start !== -1; start = lower.indexOf(query[0], start + 1)) {
      const match = matchFrom(text, lower, query, start);
      if (!match) break;
      if (!best || match.score > best.score) best = match;
    }
    return best;
  }
  function filterDocs(docs, query) {
    const q = query.trim().toLowerCase();
    if (!q) return docs.map((entry) => ({ entry, score: 0, titleRanges: [], pathRanges: [] }));
    const matches = [];
    for (const entry of docs) {
      const title = matchField(entry.title, q);
      const path = matchField(entry.relPath, q);
      if (!title && !path) continue;
      matches.push({
        entry,
        score: Math.max(title ? title.score + 2 : -Infinity, path ? path.score : -Infinity),
        titleRanges: title?.ranges ?? [],
        pathRanges: path?.ranges ?? []
      });
    }
    return matches.sort((a, b) => b.score - a.score);
  }

  // src/core/scan-limit.ts
  var SCAN_LIMIT = 5e3;

  // src/page/limits.ts
  var SCAN_LIMIT_LABEL = SCAN_LIMIT.toLocaleString("en-US");

  // src/page/dom.ts
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function highlighted(text, ranges, className = "hit") {
    const fragment = document.createDocumentFragment();
    let at = 0;
    for (const [start, end] of ranges) {
      if (start > at) fragment.append(text.slice(at, start));
      fragment.append(el("mark", className, text.slice(start, end)));
      at = end;
    }
    if (at < text.length) fragment.append(text.slice(at));
    return fragment;
  }

  // src/page/time.ts
  var MINUTE = 6e4;
  var HOUR = 60 * MINUTE;
  var DAY = 24 * HOUR;
  function relativeTime(then, now = Date.now()) {
    const elapsed = now - then;
    if (elapsed < MINUTE) return "just now";
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
    if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
    if (elapsed < 35 * DAY) return `${Math.floor(elapsed / (7 * DAY))}w ago`;
    if (elapsed < 365 * DAY) return `${Math.floor(elapsed / (30 * DAY))}mo ago`;
    return `${Math.floor(elapsed / (365 * DAY))}y ago`;
  }

  // src/page/finder.ts
  var SEARCH_DEBOUNCE_MS = 150;
  function mountFinder(host, opts) {
    const { scan } = opts;
    const root = el("div", "finder");
    const prompt = el("label", "prompt");
    const sigil = el("span", "sigil", "\u203A");
    const input = el("input", "query");
    input.id = "finder-query";
    input.spellcheck = false;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Filter documents");
    prompt.append(sigil, input);
    const list = el("ul", "rows");
    list.setAttribute("role", "listbox");
    const empty = el("p", "empty");
    const status = el("div", "status");
    const count = el("span", "count");
    const hints = el("span", "hints");
    status.append(count, hints);
    root.append(prompt, list, empty, status);
    host.append(root);
    let mode = "filter";
    let rows = [];
    let selected = 0;
    let searchTimer = null;
    let searchToken = 0;
    const docRow = (entry, titleRanges, pathRanges) => ({
      entry,
      render: () => {
        const li = el("li", "row");
        const main2 = el("div", "row-main");
        const title = el("div", "row-title");
        title.append(highlighted(entry.title, titleRanges));
        const path = el("div", "row-path");
        path.append(highlighted(entry.relPath, pathRanges));
        main2.append(title, path);
        li.append(main2, el("time", "row-time", relativeTime(entry.mtimeMs)));
        return li;
      }
    });
    const hitRow = (hit) => ({
      entry: hit.entry,
      line: hit.line,
      render: () => {
        const li = el("li", "row");
        const main2 = el("div", "row-main");
        main2.append(el("div", "row-title", hit.entry.title));
        const path = el("div", "row-path");
        const snippet = el("span", "row-snippet");
        snippet.append(highlighted(hit.snippet, [hit.range]));
        path.append(`${hit.entry.relPath}:${hit.line}  `, snippet);
        main2.append(path);
        li.append(main2, el("time", "row-time", relativeTime(hit.entry.mtimeMs)));
        return li;
      }
    });
    const paint = () => {
      list.replaceChildren(
        ...rows.map((row, i) => {
          const li = row.render();
          li.setAttribute("role", "option");
          if (i === selected) {
            li.classList.add("selected");
            li.setAttribute("aria-selected", "true");
          }
          li.addEventListener("click", () => open(i));
          li.addEventListener("mousemove", () => {
            if (selected !== i) select(i);
          });
          return li;
        })
      );
      const query = input.value.trim();
      if (scan.docs.length === 0) empty.textContent = `No markdown files in ${scan.root}`;
      else if (rows.length === 0 && query) {
        empty.textContent = mode === "search" ? `No text matches "${query}"` : `No docs match "${query}"`;
      } else empty.textContent = "";
      empty.hidden = !empty.textContent;
      list.hidden = rows.length === 0;
      const total = scan.truncated ? `showing first ${SCAN_LIMIT_LABEL} docs` : `${scan.docs.length} docs`;
      count.textContent = mode === "search" ? query ? `${rows.length} ${rows.length === 1 ? "match" : "matches"} \xB7 ${total}` : `search text \xB7 ${total}` : query ? `${rows.length} of ${total}` : total;
      hints.textContent = mode === "search" ? "enter open \xB7 esc back to filter" : "enter open \xB7 / search text \xB7 esc clear \xB7 ctrl+c quit";
      sigil.textContent = mode === "search" ? "/" : "\u203A";
      list.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
    };
    const select = (i) => {
      selected = Math.max(0, Math.min(i, rows.length - 1));
      paint();
    };
    const refilter = () => {
      rows = filterDocs(scan.docs, input.value).map(
        (m) => docRow(m.entry, m.titleRanges, m.pathRanges)
      );
      selected = 0;
      paint();
    };
    const research = () => {
      if (searchTimer) clearTimeout(searchTimer);
      const query = input.value;
      const token = ++searchToken;
      if (!query.trim()) {
        rows = [];
        paint();
        return;
      }
      searchTimer = setTimeout(async () => {
        const hits = await window.mdb.search(scan.root, query);
        if (token !== searchToken) return;
        rows = hits.map(hitRow);
        selected = 0;
        paint();
      }, SEARCH_DEBOUNCE_MS);
    };
    const open = (i) => {
      const row = rows[i];
      if (row) opts.onOpen(row.entry.path, row.line);
    };
    const setMode = (next) => {
      mode = next;
      input.value = "";
      if (mode === "filter") refilter();
      else {
        rows = [];
        selected = 0;
        paint();
      }
    };
    input.addEventListener("input", () => mode === "filter" ? refilter() : research());
    input.addEventListener("keydown", (event) => {
      const ctrl = event.ctrlKey && !event.metaKey && !event.altKey;
      if (event.key === "ArrowDown" || ctrl && event.key === "n") select(selected + 1);
      else if (event.key === "ArrowUp" || ctrl && event.key === "p") select(selected - 1);
      else if (event.key === "PageDown") select(selected + 10);
      else if (event.key === "PageUp") select(selected - 10);
      else if (event.key === "Enter") open(selected);
      else if (event.key === "Escape") {
        if (input.value) {
          input.value = "";
          if (mode === "filter") refilter();
          else research();
        } else if (mode === "search") setMode("filter");
        else return;
      } else if (event.key === "/" && mode === "filter" && !input.value) setMode("search");
      else return;
      event.preventDefault();
    });
    refilter();
    return {
      focus: () => input.focus(),
      show: () => {
        root.hidden = false;
        input.focus();
      },
      hide: () => {
        root.hidden = true;
      },
      destroy: () => root.remove()
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
    const app = document.getElementById("app");
    const loading = document.createElement("p");
    loading.className = "loading";
    loading.textContent = `Scanning ${start.root}\u2026`;
    app.append(loading);
    const scan = await window.mdb.scan(start.root);
    loading.remove();
    const finder = mountFinder(app, {
      scan,
      onOpen: (path) => {
        app.dataset.opened = path;
      }
    });
    finder.focus();
  }
  void main();
})();
