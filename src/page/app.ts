import { themeVariables } from "../core/theme.ts";
import type { StartOptions } from "../shared/types.ts";
import { mountFinder } from "./finder.ts";

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
  const app = document.getElementById("app")!;
  const loading = document.createElement("p");
  loading.className = "loading";
  loading.textContent = `Scanning ${start.root}…`;
  app.append(loading);
  const scan = await window.mdb.scan(start.root);
  loading.remove();
  const finder = mountFinder(app, {
    scan,
    onOpen: (path) => {
      app.dataset.opened = path;
    },
  });
  finder.focus();
}

void main();
