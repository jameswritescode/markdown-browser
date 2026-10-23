export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function highlighted(
  text: string,
  ranges: [number, number][],
  className = "hit",
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  let at = 0;
  for (const [start, end] of ranges) {
    if (start > at) fragment.append(text.slice(at, start));
    fragment.append(el("mark", className, text.slice(start, end)));
    at = end;
  }
  if (at < text.length) fragment.append(text.slice(at));
  return fragment;
}
