import type { StartOptions } from "../shared/types.ts";
import { el } from "./dom.ts";
import { stepMatch } from "./find.ts";
import { createTab, type Tab } from "./tab.ts";
import { tabLabels } from "./tab-labels.ts";
import { type OpenMode, routeOpen } from "./tab-route.ts";

export interface RemoteOpen {
  path: string;
  root: string;
  heading: string | null;
  mode: OpenMode;
}

export type OpenResult = "tab" | "switched" | "replaced";

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
    const paths = new Set(tabs.map((tab) => tab.path()).filter((path) => path !== null));
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

  return {
    async start() {
      const first = add(start.root);
      if (start.openPath) await first.open(start.openPath, { heading: start.heading });
      else await first.showFinder();
    },
    async open(request: RemoteOpen): Promise<{ heading: boolean | null; result: OpenResult }> {
      const summaries = tabs.map((tab) => ({ path: tab.path() }));
      const route = routeOpen(summaries, active, request.path, request.mode);
      if (route.kind === "switch") {
        activate(route.index);
        const tab = tabs[route.index]!;
        return {
          heading: request.heading ? tab.goToHeading(request.heading) : null,
          result: "switched",
        };
      }
      let tab: Tab;
      if (route.kind === "new") tab = add(request.root);
      else {
        tab = tabs[route.index]!;
        if (route.kind === "reuse") tab.setRoot(request.root);
      }
      const { heading } = await tab.open(request.path, { heading: request.heading });
      return { heading, result: route.kind === "replace" ? "replaced" : "tab" };
    },
  };
}
