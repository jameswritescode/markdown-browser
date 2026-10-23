import { mount, parse } from "pele";
import type { OutlineItem, RenderedDoc } from "../shared/types.ts";
import { el } from "./dom.ts";
import { History } from "./history.ts";

interface ReaderEntry {
  path: string;
  scrollY: number;
}

export interface ReaderOptions {
  onExit(): void;
}

const NARROW_WIDTH = 760;
const OUTLINE_MAX_LEVEL = 3;

export function mountReader(host: HTMLElement, opts: ReaderOptions) {
  const root = el("div", "reader");
  const outline = el("nav", "outline");
  outline.setAttribute("aria-label", "On this page");
  const article = el("article", "markdown-body");
  root.append(outline, article);
  host.append(root);

  const history = new History<ReaderEntry>();
  let current: RenderedDoc | null = null;
  let outlineToggled: boolean | null = null;
  let observer: IntersectionObserver | null = null;
  let headings: HTMLElement[] = [];
  let pendingFind: string | null = null;

  const outlineVisible = () => outlineToggled ?? window.innerWidth >= NARROW_WIDTH;
  const layout = () => {
    root.classList.toggle("with-outline", outlineVisible() && (current?.outline.length ?? 0) > 0);
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
    const top = Math.min(120, window.innerHeight * 0.25);
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

  const scrollToId = (id: string) => {
    const target = document.getElementById(id) ?? document.getElementById(`user-content-${id}`);
    if (!target) return false;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 16 });
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
    observer = new IntersectionObserver(markActive, { rootMargin: "0px 0px -75% 0px" });
    for (const heading of headings) observer.observe(heading);
    markActive();
  };

  const showMissing = (path: string) => {
    current = null;
    outline.replaceChildren();
    const notice = el("div", "missing");
    notice.append(
      el("p", "missing-title", "This file no longer exists"),
      el("p", "missing-path", path),
    );
    notice.append(el("p", "missing-hint", "Press esc to go back to the list."));
    article.replaceChildren(notice);
    layout();
  };

  const render = async (path: string, keepScroll: number | null, anchor: string | null) => {
    const doc = await window.mdb.render(path);
    if ("missing" in doc) {
      showMissing(path);
      return;
    }
    current = doc;
    document.title = doc.title;
    article.innerHTML = doc.html;
    renderDiagrams();
    paintOutline(doc.outline);
    layout();
    watchHeadings();
    if (keepScroll !== null) window.scrollTo({ top: keepScroll });
    else if (!(anchor && scrollToId(anchor))) window.scrollTo({ top: 0 });
    if (pendingFind) findText(pendingFind);
    pendingFind = null;
  };

  const findText = (text: string) => {
    window.getSelection()?.removeAllRanges();
    const finder = window as Window & { find?: (text: string) => boolean };
    if (finder.find?.(text)) {
      const range = window.getSelection()?.getRangeAt(0);
      if (range) {
        const top = range.getBoundingClientRect().top + window.scrollY - window.innerHeight / 3;
        window.scrollTo({ top: Math.max(0, top) });
      }
    }
  };

  const open = async (
    path: string,
    anchor: string | null = null,
    scrollY: number | null = null,
  ) => {
    window.mdb.watch(path);
    await render(path, scrollY, anchor);
  };

  const navigate = async (path: string, anchor: string | null) => {
    const here = history.current;
    if (here) history.replace({ path: here.path, scrollY: window.scrollY });
    history.push({ path, scrollY: 0 });
    await open(path, anchor);
  };

  const step = async (direction: "back" | "forward") => {
    const here = history.current;
    if (here) history.replace({ path: here.path, scrollY: window.scrollY });
    const entry = direction === "back" ? history.back() : history.forward();
    if (entry) await open(entry.path, null, entry.scrollY);
  };

  const showNotice = (anchorEl: HTMLElement, text: string) => {
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
    else if (target.kind === "doc") showNotice(link, `Not found: ${href}`);
    else if (target.kind === "file") window.mdb.reveal(target.path);
    else window.mdb.openExternal(target.url);
  });

  const unsubscribe = window.mdb.onChanged(async (path) => {
    if (root.hidden || history.current?.path !== path) return;
    await render(path, window.scrollY, null);
  });

  const onKey = (event: KeyboardEvent) => {
    if (root.hidden) return;
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey;
    const page = window.innerHeight * 0.9;
    if (event.key === "Escape") opts.onExit();
    else if ((event.metaKey || event.ctrlKey) && event.key === "[") void step("back");
    else if ((event.metaKey || event.ctrlKey) && event.key === "]") void step("forward");
    else if (event.ctrlKey && event.key === "b") {
      outlineToggled = !outlineVisible();
      layout();
    } else if (plain && (event.key === "j" || event.key === "ArrowDown"))
      window.scrollBy({ top: 60 });
    else if (plain && (event.key === "k" || event.key === "ArrowUp")) window.scrollBy({ top: -60 });
    else if (plain && (event.key === " " || event.key === "PageDown") && !event.shiftKey)
      window.scrollBy({ top: page });
    else if (
      (plain || event.shiftKey) &&
      ((event.key === " " && event.shiftKey) || event.key === "PageUp")
    )
      window.scrollBy({ top: -page });
    else if (plain && (event.key === "g" || event.key === "Home")) window.scrollTo({ top: 0 });
    else if (
      (event.key === "G" && !event.metaKey && !event.ctrlKey) ||
      (plain && event.key === "End")
    )
      window.scrollTo({ top: document.documentElement.scrollHeight });
    else return;
    event.preventDefault();
  };
  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", layout);
  window.addEventListener("scroll", () => !root.hidden && markActive(), { passive: true });

  return {
    async open(path: string, find?: string) {
      pendingFind = find?.trim() || null;
      root.hidden = false;
      await navigate(path, null);
    },
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      window.mdb.watch(null);
    },
    destroy() {
      unsubscribe();
      observer?.disconnect();
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
