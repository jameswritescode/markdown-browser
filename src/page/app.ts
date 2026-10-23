import { themeVariables } from "../core/theme.ts";
import type { StartOptions } from "../shared/types.ts";

function applyTheme(start: StartOptions): void {
  const set = (theme: Parameters<typeof themeVariables>[0]) => {
    for (const [name, value] of Object.entries(themeVariables(theme, start.background))) {
      document.documentElement.style.setProperty(name, value);
    }
  };
  set(window.pixel?.theme() ?? null);
  window.pixel?.onTheme(set);
}

async function main(): Promise<void> {
  const start = await window.mdb.start();
  applyTheme(start);
  const scan = await window.mdb.scan(start.root);
  const app = document.getElementById("app")!;
  app.textContent = `mdb: ${scan.docs.length} docs in ${start.root}`;
}

void main();
