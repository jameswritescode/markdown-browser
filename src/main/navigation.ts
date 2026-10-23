import type { WebContents } from "@zenbu-labs/pixel/electron";

export function lockNavigation(contents: WebContents, pageUrl: string): void {
  const block = (event: { preventDefault(): void }, url: string) => {
    if (url !== pageUrl) event.preventDefault();
  };
  contents.on("will-navigate", block);
  contents.on("will-redirect", block);
  contents.on("will-frame-navigate", (event) => {
    if (event.url !== pageUrl) event.preventDefault();
  });
}
