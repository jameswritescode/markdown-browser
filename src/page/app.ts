import { themeVariables } from "../core/theme.ts";
import type { StartOptions } from "../shared/types.ts";
import { mountFinder } from "./finder.ts";
import { mountReader } from "./reader.ts";

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

  let finder: ReturnType<typeof mountFinder> | null = null;

  const showFinder = async () => {
    reader.hide();
    if (!finder) {
      const loading = document.createElement("p");
      loading.className = "loading";
      loading.textContent = `Scanning ${start.root}…`;
      app.append(loading);
      const scan = await window.mdb.scan(start.root);
      loading.remove();
      finder = mountFinder(app, {
        scan,
        onOpen: (path, find) => {
          finder?.hide();
          void reader.open(path, find);
        },
      });
    }
    document.title = "mdb";
    finder.show();
  };

  const reader = mountReader(app, { root: start.root, onExit: () => void showFinder() });
  reader.hide();

  if (start.openPath) await reader.open(start.openPath);
  else await showFinder();
}

void main();
