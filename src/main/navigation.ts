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

// Pixel scales the page zoom when the terminal's font size changes, and Chromium saves
// that zoom for the page URL. Every mdb loads the same page, so one font change would
// shrink or grow every mdb after it. Start each load at the default zoom instead.
export function resetZoomOnLoad(contents: WebContents): void {
  contents.on("did-finish-load", () => contents.setZoomFactor(1));
}
