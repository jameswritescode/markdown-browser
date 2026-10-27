import { el } from "./dom.ts";
import { mountFinder } from "./finder.ts";
import { mountReader } from "./reader.ts";

export interface TabHooks {
  isActive(): boolean;
  tabInfo(): string;
  hints(): string;
  onState(): void;
  onReload(): void;
}

export type Tab = ReturnType<typeof createTab>;

/** One tab: a pane with its own folder, finder and reader. */
export function createTab(host: HTMLElement, startRoot: string, hooks: TabHooks) {
  const pane = el("div", "tab-pane");
  host.append(pane);
  let root = startRoot;
  let finder: ReturnType<typeof mountFinder> | null = null;
  let scanning = false;
  // The reader reports state while it is made; the tab is not ready to hear it yet.
  let made = false;
  let destroyed = false;
  let rescans = 0;

  const reader = mountReader(pane, {
    root: () => root,
    isActive: hooks.isActive,
    tabInfo: hooks.tabInfo,
    hints: hooks.hints,
    onState: () => made && hooks.onState(),
    onReload: hooks.onReload,
    onExit: () => void showFinder(),
  });
  reader.hide();
  made = true;

  /** Scans the folder again, so the finder knows about files that came or went. */
  const rescan = async () => {
    if (!finder) return;
    const seq = ++rescans;
    const scanRoot = root;
    const scan = await window.mdb.scan(scanRoot);
    if (destroyed || seq !== rescans || scanRoot !== root) return;
    finder?.update(scan);
  };

  const showFinder = async () => {
    reader.hide();
    if (finder) void rescan();
    else {
      if (scanning) return;
      scanning = true;
      const loading = el("p", "loading", `Scanning ${root}…`);
      pane.append(loading);
      const scanRoot = root;
      const scan = await window.mdb.scan(scanRoot);
      loading.remove();
      scanning = false;
      // The tab closed, or took another folder or another document, while the scan ran.
      if (destroyed || scanRoot !== root || reader.currentPath()) return;
      finder = mountFinder(pane, {
        scan,
        isActive: hooks.isActive,
        hints: hooks.hints,
        onOpen: (path, find) => {
          finder?.hide();
          void reader.open(path, { find });
        },
      });
    }
    finder.show();
    if (!hooks.isActive()) (document.activeElement as HTMLElement | null)?.blur();
    hooks.onState();
  };

  const unsubscribeFolder = window.mdb.onFolderChanged((changed) => {
    if (changed === root && finder && !reader.currentPath()) void rescan();
  });

  const open = (path: string, options: { heading?: string | null; find?: string } = {}) => {
    finder?.hide();
    return reader.open(path, options);
  };

  return {
    pane,
    root: () => root,
    /** The document this tab shows, or null when it shows its finder. */
    path: () => reader.currentPath(),
    /** The document's title, or null when the tab shows its finder or has no document yet. */
    title: () => (reader.currentPath() ? reader.title() : null),
    open,
    showFinder,
    goToHeading: (heading: string) => reader.goToHeading(heading),
    /** Gives the tab a new folder. Its finder is made again for that folder. */
    setRoot(next: string) {
      if (next === root) return;
      root = next;
      finder?.destroy();
      finder = null;
    },
    activate() {
      reader.activate();
      if (finder && !reader.currentPath()) finder.focus();
      else (document.activeElement as HTMLElement | null)?.blur();
    },
    deactivate: () => reader.deactivate(),
    refresh() {
      reader.refresh();
      finder?.refresh();
    },
    destroy() {
      destroyed = true;
      unsubscribeFolder();
      reader.destroy();
      finder?.destroy();
      pane.remove();
    },
  };
}
