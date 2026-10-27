import { filterDocs } from "../core/filter.ts";
import { SCAN_LIMIT_LABEL } from "./limits.ts";
import type { DocEntry, ScanResult, SearchHit } from "../shared/types.ts";
import { el, highlighted } from "./dom.ts";
import { relativeTime } from "./time.ts";

interface Row {
  entry: DocEntry;
  render(): HTMLElement;
  find?: string;
}

export interface FinderOptions {
  scan: ScanResult;
  /** Only the front tab's finder handles keys. */
  isActive(): boolean;
  /** Extra hints for the status line, starting with " · ", or "". */
  hints(): string;
  onOpen(path: string, find?: string): void;
}

const SEARCH_DEBOUNCE_MS = 150;

export function mountFinder(host: HTMLElement, opts: FinderOptions) {
  const { scan } = opts;
  const root = el("div", "finder");
  const prompt = el("label", "prompt");
  const sigil = el("span", "sigil", "›");
  const input = el("input", "query");
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

  let mode: "filter" | "search" = "filter";
  let rows: Row[] = [];
  let selected = 0;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let searchToken = 0;

  const docRow = (
    entry: DocEntry,
    titleRanges: [number, number][],
    pathRanges: [number, number][],
  ): Row => ({
    entry,
    render: () => {
      const li = el("li", "row");
      const main = el("div", "row-main");
      const title = el("div", "row-title");
      title.append(highlighted(entry.title, titleRanges));
      const path = el("div", "row-path");
      path.append(highlighted(entry.relPath, pathRanges));
      main.append(title, path);
      li.append(main, el("time", "row-time", relativeTime(entry.mtimeMs)));
      return li;
    },
  });

  const hitRow = (hit: SearchHit): Row => ({
    entry: hit.entry,
    find: hit.snippet.slice(...hit.range),
    render: () => {
      const li = el("li", "row");
      const main = el("div", "row-main");
      main.append(el("div", "row-title", hit.entry.title));
      const path = el("div", "row-path");
      const snippet = el("span", "row-snippet");
      snippet.append(highlighted(hit.snippet, [hit.range]));
      path.append(`${hit.entry.relPath}:${hit.line}  `, snippet);
      main.append(path);
      li.append(main, el("time", "row-time", relativeTime(hit.entry.mtimeMs)));
      return li;
    },
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
        return li;
      }),
    );
    const query = input.value.trim();
    if (scan.docs.length === 0) empty.textContent = `No markdown files in ${scan.root}`;
    else if (rows.length === 0 && query) {
      empty.textContent =
        mode === "search" ? `No text matches "${query}"` : `No docs match "${query}"`;
    } else empty.textContent = "";
    empty.hidden = !empty.textContent;
    list.hidden = rows.length === 0;
    const total = scan.truncated
      ? `showing first ${SCAN_LIMIT_LABEL} docs`
      : `${scan.docs.length} docs`;
    count.textContent =
      mode === "search"
        ? query
          ? `${rows.length} ${rows.length === 1 ? "match" : "matches"} · ${total}`
          : `search text · ${total}`
        : query
          ? `${rows.length} of ${total}`
          : total;
    hints.textContent =
      mode === "search"
        ? "enter open · esc back to filter"
        : "enter open · / search text · esc clear · ctrl+c quit";
    hints.textContent += opts.hints();
    sigil.textContent = mode === "search" ? "/" : "›";
    list.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
  };

  const select = (i: number) => {
    selected = Math.max(0, Math.min(i, rows.length - 1));
    paint();
  };

  const refilter = () => {
    rows = filterDocs(scan.docs, input.value).map((m) =>
      docRow(m.entry, m.titleRanges, m.pathRanges),
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

  const open = (i: number) => {
    const row = rows[i];
    if (row) opts.onOpen(row.entry.path, row.find);
  };

  const setMode = (next: "filter" | "search") => {
    mode = next;
    input.value = "";
    if (mode === "filter") refilter();
    else {
      rows = [];
      selected = 0;
      paint();
    }
  };

  // Chromium sends a mousemove at the same position when the rows change under a
  // still pointer. Only a real move selects a row, so keyboard moves stay put.
  let pointer = { x: -1, y: -1 };
  list.addEventListener("mousemove", (event) => {
    if (event.clientX === pointer.x && event.clientY === pointer.y) return;
    pointer = { x: event.clientX, y: event.clientY };
    const row = (event.target as Element).closest(".row");
    const i = row ? [...list.children].indexOf(row) : -1;
    if (i >= 0 && i !== selected) select(i);
  });

  input.addEventListener("input", () => (mode === "filter" ? refilter() : research()));
  const onKey = (event: KeyboardEvent) => {
    if (root.hidden || !opts.isActive() || event.defaultPrevented) return;
    const ctrl = event.ctrlKey && !event.metaKey && !event.altKey;
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
    if (document.activeElement !== input && plain && event.key.length === 1) input.focus();
    if (event.key === "ArrowDown" || (ctrl && (event.key === "n" || event.key === "j")))
      select(selected + 1);
    else if (event.key === "ArrowUp" || (ctrl && (event.key === "p" || event.key === "k")))
      select(selected - 1);
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
  };
  window.addEventListener("keydown", onKey);

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
    refresh: () => paint(),
    destroy: () => {
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
