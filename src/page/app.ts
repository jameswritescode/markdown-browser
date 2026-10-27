import { themeVariables } from "../core/theme.ts";
import type { StartOptions } from "../shared/types.ts";
import { mountTabs } from "./tabs.ts";

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
  const tabs = mountTabs(document.getElementById("app")!, start);
  window.mdbRemote = { open: (request) => tabs.open(request) };
  window.mdb.ready();
  await tabs.start();
}

void main();
