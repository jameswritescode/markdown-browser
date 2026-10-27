import { isStdinKey } from "../shared/stdin-key.ts";
import type { StartOptions } from "../shared/types.ts";
import { el } from "./dom.ts";
import { stepMatch } from "./find.ts";
import { createTab, type Tab } from "./tab.ts";
import { tabLabels } from "./tab-labels.ts";
import { type OpenMode, routeOpen } from "./tab-route.ts";

export interface RemoteOpen {
  /** A file, a stdin key, or null for the file list of `root`. */
  path: string | null;
  root: string;
  heading: string | null;
  mode: OpenMode;
  /** The text of a stdin document. `path` is then its key. */
  content?: { key: string; text: string; title: string | null };
}

export type OpenResult = "tab" | "switched" | "replaced" | "updated";
type Opened = { heading: boolean | null; result: OpenResult };

const WAIT_FOR_OPEN_MS = 20_000;
const TAB_HINTS = " · ctrl+t new tab · ctrl+w close";

/** The tab bar and the tabs below it. */
export function mountTabs(host: HTMLElement, start: StartOptions) {
  const bar = el("div", "tabbar");
  bar.setAttribute("role", "tablist");
  const body = el("div", "tab-body");
  host.append(bar, body);

  const tabs: Tab[] = [];
  const changed = new Set<Tab>();
  let active = -1;

  const make = (root: string) => {
    // The hooks can run while createTab is still building the tab.
    let tab: Tab | null = null;
    tab = createTab(body, root, {
      isActive: () => tab !== null && tabs[active] === tab,
      tabInfo: () => (tab && tabs.length > 1 ? `${tabs.indexOf(tab) + 1} of ${tabs.length}` : ""),
      hints: () => (tabs.length > 1 ? TAB_HINTS : ""),
      onState: () => sync(),
      onReload: () => {
        if (tab) changed.add(tab);
        paintBar();
      },
    });
    return tab;
  };

  const paintBar = () => {
    bar.hidden = tabs.length < 2;
    const labels = tabLabels(
      tabs.map((tab) => ({ path: tab.path(), root: tab.root(), title: tab.title() })),
    );
    const cells = tabs.map((tab, i) => {
      const cell = el("div", "tab");
      cell.setAttribute("role", "tab");
      cell.setAttribute("aria-selected", String(i === active));
      cell.classList.toggle("active", i === active);
      cell.classList.toggle("changed", changed.has(tab));
      cell.title = tab.path() ?? tab.root();
      const close = el("button", "tab-close", "✕");
      close.type = "button";
      close.setAttribute("aria-label", "Close tab");
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        closeTab(tabs.indexOf(tab));
      });
      cell.append(el("span", "tab-label", labels[i]), close);
      cell.addEventListener("click", () => activate(tabs.indexOf(tab)));
      return cell;
    });
    const add = el("button", "tab-new", "+");
    add.type = "button";
    add.setAttribute("aria-label", "New tab");
    add.addEventListener("click", () => void newTab());
    bar.replaceChildren(...cells, add);
    cells[active]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const sync = () => {
    const paths = new Set(
      tabs
        .map((tab) => tab.path())
        .filter((path): path is string => path !== null && !isStdinKey(path)),
    );
    window.mdb.watch([...paths]);
    const roots = new Set(tabs.filter((tab) => tab.path() === null).map((tab) => tab.root()));
    window.mdb.watchFolders([...roots]);
    document.title = tabs[active]?.title() ?? "mdb";
    paintBar();
  };

  const activate = (index: number) => {
    const next = tabs[index];
    if (!next) return;
    const previous = tabs[active];
    if (previous && previous !== next) previous.deactivate();
    active = index;
    changed.delete(next);
    for (const tab of tabs) tab.pane.classList.toggle("background", tab !== next);
    next.activate();
    for (const tab of tabs) tab.refresh();
    sync();
  };

  const add = (root: string) => {
    tabs.push(make(root));
    activate(tabs.length - 1);
    return tabs[active]!;
  };

  const newTab = () => add(tabs[active]?.root() ?? start.root).showFinder();

  const closeTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    if (tabs.length === 1) {
      window.mdb.quit();
      return;
    }
    tabs.splice(index, 1);
    changed.delete(tab);
    // A stdin document lives only in its tab.
    const kept = new Set(tabs.flatMap((other) => other.historyPaths()));
    const gone = tab.historyPaths().filter((path) => isStdinKey(path) && !kept.has(path));
    if (gone.length) window.mdb.forgetStdin([...new Set(gone)]);
    tab.destroy();
    if (index === active) {
      // The tab to the right takes its place, or the one to the left when it was last.
      active = -1;
      activate(Math.min(index, tabs.length - 1));
    } else {
      if (index < active) active -= 1;
      for (const other of tabs) other.refresh();
      sync();
    }
  };

  // Capture, so the keys work in the finder and find fields and never reach them:
  // in a text field, Chromium on macOS deletes a character on ctrl+h.
  window.addEventListener(
    "keydown",
    (event) => {
      if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (event.key === "t") void newTab();
      else if (event.key === "w") closeTab(active);
      else if (event.key === "h") activate(stepMatch(active, tabs.length, -1));
      else if (event.key === "l") activate(stepMatch(active, tabs.length, 1));
      else return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  const openNow = async (request: RemoteOpen): Promise<Opened> => {
    const { path, root, heading, content } = request;
    if (content)
      await window.mdb.putStdin(content.key, {
        text: content.text,
        title: content.title,
        base: root,
      });
    const summaries = tabs.map((tab) => ({
      path: tab.path(),
      root: tab.root(),
      paths: tab.historyPaths(),
    }));
    const route = routeOpen(summaries, active, request);
    if (route.kind === "update") {
      // The main process sent a change for the key; the reader re-renders it in place.
      const tab = tabs[route.index]!;
      if (!heading) {
        if (route.index !== active) changed.add(tab);
        paintBar();
        return { heading: null, result: "updated" };
      }
      activate(route.index);
      // The tab may show another document or its file list now; bring the stdin document back.
      if (tab.path() !== path) {
        const opened = await tab.open(path!, { heading });
        return { heading: opened.heading, result: "updated" };
      }
      await tab.reload();
      return { heading: tab.goToHeading(heading), result: "updated" };
    }
    if (route.kind === "switch") {
      activate(route.index);
      const tab = tabs[route.index]!;
      return {
        heading: heading && path ? tab.goToHeading(heading) : null,
        result: "switched",
      };
    }
    let tab: Tab;
    if (route.kind === "new") tab = add(root);
    else {
      tab = tabs[route.index]!;
      if (route.kind === "reuse" || path === null) tab.setRoot(root);
    }
    const result = route.kind === "replace" ? "replaced" : "tab";
    if (path === null) {
      await tab.showFinder();
      return { heading: null, result };
    }
    const opened = await tab.open(path, { heading });
    return { heading: opened.heading, result };
  };

  // One open at a time, so two pipes with the same title cannot make two tabs.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    async start() {
      const first = add(start.root);
      if (start.openPath) await first.open(start.openPath, { heading: start.heading });
      else if (start.waitToken) {
        // The CLI that started this mdb sends the document next; it lands in this empty tab.
        setTimeout(() => {
          if (tabs.includes(first) && first.path() === null) void first.showFinder();
        }, WAIT_FOR_OPEN_MS);
      } else await first.showFinder();
    },
    open(request: RemoteOpen): Promise<Opened> {
      const next = queue.then(() => openNow(request));
      queue = next.catch(() => {});
      return next;
    },
  };
}
