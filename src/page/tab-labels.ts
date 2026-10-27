const baseName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const folderName = (path: string) => baseName(path.slice(0, path.lastIndexOf("/")));

/** Names each tab by its file, and adds the folder when two tabs share a file name. */
export function tabLabels(tabs: { path: string | null; root: string }[]): string[] {
  const names = tabs.map((tab) => (tab.path === null ? null : baseName(tab.path)));
  return tabs.map(({ path, root }) => {
    if (path === null) return `Files · ${baseName(root)}`;
    const name = baseName(path);
    const shared = names.filter((other) => other === name).length > 1;
    return shared ? `${name} · ${folderName(path)}` : name;
  });
}
