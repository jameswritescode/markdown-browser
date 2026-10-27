import { isTitledStdinKey } from "../shared/stdin-key.ts";

export type OpenMode = "tab" | "replace";

/** A tab as routing sees it. */
export interface TabSummary {
  /** The document it shows, or null when it shows its finder. */
  path: string | null;
  root: string;
  /** Every document in its history. */
  paths: readonly string[];
  /** The empty first tab of an mdb that a CLI started for one stdin document. */
  waiting?: boolean;
}

/** What the CLI asks for: a document, or a folder's file list when `path` is null. */
export interface OpenTarget {
  path: string | null;
  root: string;
  mode: OpenMode;
  /** This is the document that the waiting tab is for. */
  claim?: boolean;
}

export type Route =
  | { kind: "switch"; index: number }
  | { kind: "update"; index: number }
  | { kind: "reuse"; index: number }
  | { kind: "replace"; index: number }
  | { kind: "new" };

/** Decides where a document or folder from the CLI goes. */
export function routeOpen(tabs: TabSummary[], active: number, target: OpenTarget): Route {
  const { path, root, mode } = target;
  if (path !== null && isTitledStdinKey(path)) {
    // A titled stdin document belongs to its tab, even when the tab moved on to another document.
    const owner = tabs.findIndex((tab) => tab.paths.includes(path));
    if (owner >= 0) return { kind: "update", index: owner };
  }
  const waiting = tabs.findIndex((tab) => tab.waiting);
  if (target.claim && waiting >= 0) return { kind: "reuse", index: waiting };
  // Other opens leave the waiting tab alone.
  if (waiting >= 0) {
    const others = tabs.map((tab) => (tab.waiting ? { root: "", path: "", paths: [] } : tab));
    return routeOpen(others, active, { ...target, claim: false });
  }
  if (path === null) {
    const open = tabs.findIndex((tab) => tab.path === null && tab.root === root);
    if (open >= 0) return { kind: "switch", index: open };
    return mode === "replace" ? { kind: "replace", index: active } : { kind: "new" };
  }
  const open = tabs.findIndex((tab) => tab.path === path);
  if (open >= 0) return { kind: "switch", index: open };
  if (tabs[active]?.path === null) return { kind: "reuse", index: active };
  return mode === "replace" ? { kind: "replace", index: active } : { kind: "new" };
}
