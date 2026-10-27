export type OpenMode = "tab" | "replace";

/** A tab as routing sees it: the document it shows, or null when it shows its finder. */
export interface TabSummary {
  path: string | null;
}

export type Route =
  | { kind: "switch"; index: number }
  | { kind: "reuse"; index: number }
  | { kind: "replace"; index: number }
  | { kind: "new" };

/** Decides where a document from the CLI goes. */
export function routeOpen(tabs: TabSummary[], active: number, path: string, mode: OpenMode): Route {
  const open = tabs.findIndex((tab) => tab.path === path);
  if (open >= 0) return { kind: "switch", index: open };
  if (tabs[active]?.path === null) return { kind: "reuse", index: active };
  return mode === "replace" ? { kind: "replace", index: active } : { kind: "new" };
}
