import { mount, parse } from "pele";
import { findHeading } from "../core/heading.ts";
import type { OutlineItem, RenderedDoc } from "../shared/types.ts";
import { addCopyButtons } from "./copy-code.ts";
import { el } from "./dom.ts";
import { findMatches, stepMatch } from "./find.ts";
import { History } from "./history.ts";

interface ReaderEntry {
  path: string;
  scrollY: number;
}

export interface ReaderOptions {
  root(): string;
  /** Only the front tab's reader handles keys and paints find highlights. */
  isActive(): boolean;
  /** The tab position for the status line, such as "2 of 5", or "". */
  tabInfo(): string;
  /** Extra hints for the status line, starting with " · ", or "". */
  hints(): string;
  /** The document, its title or its path changed. */
  onState(): void;
  /** A live reload rendered while this reader was not the front one. */
  onReload(path: string): void;
  onExit(): void;
}

const OUTLINE_MAX_LEVEL = 3;
const FIND_HIGHLIGHT = "mdb-find";
const FIND_CURRENT_HIGHLIGHT = "mdb-find-current";

export function mountReader(host: HTMLElement, opts: ReaderOptions) {
  const root = el("div", "reader");
  const outline = el("nav", "outline");
  outline.setAttribute("aria-label", "On this page");
  const article = el("article", "markdown-body");
  const scroller = el("div", "reader-scroll");
  const content = el("div", "reader-content");
  scroller.append(article);
  content.append(outline, scroller);
  const status = el("div", "status");
  const where = el("span", "where");
  const findBox = el("label", "find");
  const findInput = el("input", "find-query");
  findInput.spellcheck = false;
  findInput.autocomplete = "off";
  findInput.setAttribute("aria-label", "Find in document");
  const findCount = el("span", "find-count");
  findBox.append(el("span", "sigil", "/"), findInput, findCount);
  findBox.hidden = true;
  const hints = el("span", "hints");
  status.append(where, findBox, hints);
  root.append(content, status);
  host.append(root);

  const history = new History<ReaderEntry>();
  let current: RenderedDoc | null = null;
  let outlineShown = false;
  let observer: IntersectionObserver | null = null;
  let headings: HTMLElement[] = [];
  let pendingFind: string | null = null;
  let renderSeq = 0;
  let notice = "";
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let findQuery = "";
  let findRanges: Range[] = [];
  let findAt = -1;

  const layout = () => {
    content.classList.toggle("with-outline", outlineShown && (current?.outline.length ?? 0) > 0);
  };

  const relPath = (path: string) => {
    const root = opts.root();
    return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
  };

  const paintStatus = () => {
    const path = history.current?.path;
    const range = scroller.scrollHeight - scroller.clientHeight;
    const percent = range > 0 ? Math.round((scroller.scrollTop / range) * 100) : 100;
    const tab = opts.tabInfo();
    const state = current ? `${percent}%` : "missing";
    where.textContent = path ? `${relPath(path)} · ${tab ? `${tab} · ` : ""}${state}` : "";
    if (notice) where.textContent += ` · ${notice}`;
    const finding = !findBox.hidden;
    where.hidden = finding;
    if (findQuery) {
      findCount.textContent = findRanges.length
        ? `${findAt + 1} of ${findRanges.length}`
        : "no matches";
    } else findCount.textContent = "";
    if (finding) hints.textContent = "enter done · esc cancel";
    else if (findRanges.length) {
      where.textContent = `/${findQuery} · ${findAt + 1} of ${findRanges.length}`;
      hints.textContent = "n next · N previous · esc clear";
    } else if (current) hints.textContent = "/ find · esc files · ctrl+b outline · ctrl+[ back";
    else hints.textContent = "esc files";
    if (!finding && !findRanges.length) hints.textContent += opts.hints();
  };

  const showNotice = (text: string) => {
    notice = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice = "";
      paintStatus();
    }, 5000);
    paintStatus();
  };

  const paintOutline = (items: OutlineItem[]) => {
    const title = el("p", "outline-title", "On this page");
    const list = el("ul");
    for (const item of items.filter((i) => i.level <= OUTLINE_MAX_LEVEL)) {
      const li = el("li", `outline-item level-${item.level}`);
      const link = el("a", undefined, item.text);
      link.href = `#${item.id}`;
      link.dataset.id = item.id;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        scrollToId(item.id);
      });
      li.append(link);
      list.append(li);
    }
    outline.replaceChildren(title, list);
  };

  const markActive = () => {
    const top = scroller.getBoundingClientRect().top + Math.min(120, scroller.clientHeight * 0.25);
    let active: HTMLElement | null = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= top) active = heading;
      else break;
    }
    active ??= headings[0] ?? null;
    for (const link of outline.querySelectorAll<HTMLAnchorElement>("a[data-id]")) {
      link.classList.toggle("active", link.dataset.id === active?.id);
    }
    outline.querySelector(".active")?.scrollIntoView({ block: "nearest" });
  };

  const scrollToTop = (viewportTop: number) => {
    scroller.scrollTo({
      top: viewportTop - scroller.getBoundingClientRect().top + scroller.scrollTop,
    });
  };

  const scrollToId = (id: string) => {
    const target = document.getElementById(id) ?? document.getElementById(`user-content-${id}`);
    if (!target) return false;
    scrollToTop(target.getBoundingClientRect().top - 16);
    return true;
  };

  const renderDiagrams = () => {
    for (const block of article.querySelectorAll<HTMLElement>("pre.mermaid")) {
      const source = block.textContent ?? "";
      const figure = el("div", "diagram");
      block.replaceWith(figure);
      try {
        parse(source);
        mount(figure, source);
        if (!figure.querySelector("svg")) throw new Error("no diagram was drawn");
      } catch (error) {
        const fallback = el("pre");
        fallback.append(el("code", undefined, source));
        const message = error instanceof Error ? error.message : String(error);
        figure.replaceChildren(fallback, el("p", "diagram-error", `Diagram error: ${message}`));
        figure.classList.add("failed");
      }
    }
  };

  const watchHeadings = () => {
    observer?.disconnect();
    headings = [
      ...article.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"),
    ];
    observer = new IntersectionObserver(markActive, {
      root: scroller,
      rootMargin: "0px 0px -75% 0px",
    });
    for (const heading of headings) observer.observe(heading);
    markActive();
  };

  const paintFind = () => {
    if (!opts.isActive()) return paintStatus();
    const active = findRanges[findAt];
    CSS.highlights.set(FIND_HIGHLIGHT, new Highlight(...findRanges.filter((r) => r !== active)));
    if (active) CSS.highlights.set(FIND_CURRENT_HIGHLIGHT, new Highlight(active));
    else CSS.highlights.delete(FIND_CURRENT_HIGHLIGHT);
    paintStatus();
  };

  const showMatch = () => {
    const range = findRanges[findAt];
    if (range) scrollToTop(range.getBoundingClientRect().top - scroller.clientHeight / 3);
    paintFind();
  };

  const runFind = (query: string, from: "top" | "view") => {
    findQuery = query;
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement?.closest("svg, style, script")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    findRanges = findMatches(
      nodes.map((n) => n.data),
      query,
    ).map((m) => {
      const range = document.createRange();
      range.setStart(nodes[m.index]!, m.start);
      range.setEnd(nodes[m.index]!, m.end);
      return range;
    });
    const viewTop = scroller.getBoundingClientRect().top;
    const inView = findRanges.findIndex((r) => r.getBoundingClientRect().top >= viewTop);
    findAt = findRanges.length ? (from === "view" && inView >= 0 ? inView : 0) : -1;
    showMatch();
  };

  const clearFind = () => {
    findQuery = "";
    findRanges = [];
    findAt = -1;
    paintFind();
  };

  const openFind = () => {
    findBox.hidden = false;
    findInput.value = findQuery;
    findInput.focus();
    findInput.select();
    paintStatus();
  };

  const closeFind = (keep: boolean) => {
    findBox.hidden = true;
    findInput.blur();
    if (!keep || !findRanges.length) clearFind();
    else paintStatus();
  };

  findInput.addEventListener("input", () => runFind(findInput.value, "view"));
  findInput.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") closeFind(true);
    else if (event.key === "Escape") closeFind(false);
    else return;
    event.preventDefault();
  });

  const showMissing = (path: string) => {
    current = null;
    clearFind();
    outline.replaceChildren();
    const notice = el("div", "missing");
    notice.append(
      el("p", "missing-title", "This file no longer exists"),
      el("p", "missing-path", path),
    );
    notice.append(el("p", "missing-hint", "Press esc to go back to the list."));
    article.replaceChildren(notice);
    layout();
    paintStatus();
    opts.onState();
  };

  const render = async (
    path: string,
    keepScroll: number | null,
    anchor: string | null,
    heading: string | null = null,
  ): Promise<boolean | null> => {
    const seq = ++renderSeq;
    const doc = await window.mdb.render(path);
    if (seq !== renderSeq) return null;
    if ("missing" in doc) {
      showMissing(path);
      return null;
    }
    current = doc;
    let headingFound: boolean | null = null;
    if (heading) {
      const id = findHeading(doc.outline, heading);
      headingFound = id !== null;
      if (id) anchor = id;
      else showNotice(`no heading matches "${heading}"`);
    }
    article.innerHTML = doc.html;
    renderDiagrams();
    addCopyButtons(article);
    paintOutline(doc.outline);
    layout();
    watchHeadings();
    if (keepScroll !== null) scroller.scrollTo({ top: keepScroll });
    else if (!(anchor && scrollToId(anchor))) scroller.scrollTo({ top: 0 });
    if (pendingFind) runFind(pendingFind, "top");
    else if (keepScroll !== null && findQuery) {
      const at = findAt;
      runFind(findQuery, "top");
      findAt = Math.min(at, findRanges.length - 1);
      paintFind();
    } else clearFind();
    pendingFind = null;
    opts.onState();
    return headingFound;
  };

  const open = async (
    path: string,
    anchor: string | null = null,
    scrollY: number | null = null,
    heading: string | null = null,
  ) => {
    return render(path, scrollY, anchor, heading);
  };

  const navigate = async (path: string, anchor: string | null, heading: string | null = null) => {
    const here = history.current;
    if (here) history.replace({ path: here.path, scrollY: scroller.scrollTop });
    history.push({ path, scrollY: 0 });
    return open(path, anchor, null, heading);
  };

  const step = async (direction: "back" | "forward") => {
    const here = history.current;
    if (here) history.replace({ path: here.path, scrollY: scroller.scrollTop });
    const entry = direction === "back" ? history.back() : history.forward();
    if (entry) await open(entry.path, null, entry.scrollY);
  };

  const showLinkNotice = (anchorEl: HTMLElement, text: string) => {
    anchorEl.parentElement?.querySelector(".link-notice")?.remove();
    const notice = el("span", "link-notice", text);
    anchorEl.after(notice);
    setTimeout(() => notice.remove(), 4000);
  };

  article.addEventListener("click", async (event) => {
    const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    event.preventDefault();
    if (!current) return;
    const href = link.getAttribute("href")!;
    const target = await window.mdb.classifyLink(href, current.path);
    if (target.kind === "anchor") scrollToId(target.id);
    else if (target.kind === "doc" && target.exists) await navigate(target.path, target.anchor);
    else if (target.kind === "doc") showLinkNotice(link, `Not found: ${href}`);
    else if (target.kind === "file") window.mdb.reveal(target.path);
    else window.mdb.openExternal(target.url);
  });

  const unsubscribe = window.mdb.onChanged(async (path) => {
    if (root.hidden || history.current?.path !== path) return;
    await render(path, scroller.scrollTop, null);
    if (!opts.isActive()) opts.onReload(path);
  });

  const showMatchStep = (by: 1 | -1) => {
    if (!findRanges.length) return;
    findAt = stepMatch(findAt, findRanges.length, by);
    showMatch();
  };

  const onKey = (event: KeyboardEvent) => {
    if (root.hidden || !opts.isActive() || event.target === findInput) return;
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey;
    const page = scroller.clientHeight * 0.9;
    if (event.key === "Escape" && findRanges.length) clearFind();
    else if (event.key === "Escape") opts.onExit();
    else if (plain && event.key === "/" && current) openFind();
    else if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "n")
      showMatchStep(1);
    else if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key === "N")
      showMatchStep(-1);
    else if ((event.metaKey || event.ctrlKey) && event.key === "[") void step("back");
    else if ((event.metaKey || event.ctrlKey) && event.key === "]") void step("forward");
    else if (event.ctrlKey && event.key === "b") {
      outlineShown = !outlineShown;
      layout();
    } else if (plain && (event.key === "j" || event.key === "ArrowDown"))
      scroller.scrollBy({ top: 60 });
    else if (plain && (event.key === "k" || event.key === "ArrowUp"))
      scroller.scrollBy({ top: -60 });
    else if (plain && event.key === "d") scroller.scrollBy({ top: scroller.clientHeight / 2 });
    else if (plain && event.key === "u") scroller.scrollBy({ top: -scroller.clientHeight / 2 });
    else if (plain && (event.key === " " || event.key === "PageDown") && !event.shiftKey)
      scroller.scrollBy({ top: page });
    else if (
      (plain || event.shiftKey) &&
      ((event.key === " " && event.shiftKey) || event.key === "PageUp")
    )
      scroller.scrollBy({ top: -page });
    else if (plain && (event.key === "g" || event.key === "Home")) scroller.scrollTo({ top: 0 });
    else if (
      (event.key === "G" && !event.metaKey && !event.ctrlKey) ||
      (plain && event.key === "End")
    )
      scroller.scrollTo({ top: scroller.scrollHeight });
    else return;
    event.preventDefault();
  };
  window.addEventListener("keydown", onKey);
  scroller.addEventListener(
    "scroll",
    () => {
      markActive();
      paintStatus();
    },
    { passive: true },
  );

  return {
    async open(path: string, { find, heading }: { find?: string; heading?: string | null } = {}) {
      pendingFind = find?.trim() || null;
      root.hidden = false;
      return { heading: await navigate(path, null, heading?.trim() || null) };
    },
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      closeFind(false);
      opts.onState();
    },
    /** The document this reader shows, even when its file is missing; null when hidden. */
    currentPath: () => (root.hidden ? null : (history.current?.path ?? null)),
    title: () => current?.title ?? "mdb",
    goToHeading(heading: string) {
      const id = current ? findHeading(current.outline, heading) : null;
      if (id) scrollToId(id);
      else showNotice(`no heading matches "${heading}"`);
      return id !== null;
    },
    activate() {
      paintFind();
    },
    deactivate() {
      closeFind(true);
    },
    refresh: () => paintStatus(),
    destroy() {
      unsubscribe();
      observer?.disconnect();
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
