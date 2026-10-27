import { el } from "./dom.ts";

// Octicons copy-16 and check-16.
const COPY_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';
const COPIED_MS = 2000;

/** Puts a copy button in the top right of each code block. */
export function addCopyButtons(article: HTMLElement): void {
  for (const pre of article.querySelectorAll<HTMLElement>("pre:not(.frontmatter-raw)")) {
    const code = pre.querySelector(":scope > code");
    if (!code) continue;
    const block = el("div", "code-block");
    pre.replaceWith(block);
    block.append(
      pre,
      copyButton(() => code.textContent ?? ""),
    );
  }
}

function copyButton(text: () => string): HTMLButtonElement {
  const button = el("button", "copy-code");
  button.type = "button";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const show = (copied: boolean) => {
    button.classList.toggle("copied", copied);
    button.innerHTML = copied ? CHECK_ICON : COPY_ICON;
    button.title = copied ? "Copied" : "Copy";
    button.setAttribute("aria-label", button.title);
  };
  show(false);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    window.mdb.copy(text());
    show(true);
    clearTimeout(timer);
    timer = setTimeout(() => show(false), COPIED_MS);
  });
  return button;
}
