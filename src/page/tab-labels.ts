import { isStdinKey } from "../shared/stdin-key.ts";

const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const folderName = (path: string) => baseName(path.slice(0, path.lastIndexOf("/")));

export interface TabLabelInput {
  /** The document, or null when the tab shows its finder. */
  path: string | null;
  root: string;
  /** The document's title, as the file list shows it, or null before it renders. */
  title: string | null;
}

/**
 * Names each tab by its document's title, falling back to the file name. When two
 * tabs share a name, the file name is added, or the folder when the file names match too.
 * A stdin document shows its title, or "stdin".
 */
export function tabLabels(tabs: TabLabelInput[]): string[] {
  const names = tabs.map(({ path, title }) =>
    path === null ? null : (title ?? (isStdinKey(path) ? "stdin" : baseName(path))),
  );
  return tabs.map(({ path, root }, i) => {
    if (path === null) return `Files · ${baseName(root)}`;
    const name = names[i]!;
    const sharing = tabs.filter((_, j) => names[j] === name);
    // A stdin document has no file name or folder to tell it apart.
    if (sharing.length < 2 || isStdinKey(path)) return name;
    const file = baseName(path);
    const sameFile = sharing.filter((other) => other.path && baseName(other.path) === file);
    return `${name} · ${sameFile.length > 1 || file === name ? folderName(path) : file}`;
  });
}
