// No Node imports here: the page uses these too.
export const STDIN_PREFIX = "stdin:";
const TITLE_PREFIX = `${STDIN_PREFIX}title:`;

export function isStdinKey(path: string): boolean {
  return path.startsWith(STDIN_PREFIX);
}

/** A titled key: the same for every pipe with that title. */
export function isTitledStdinKey(path: string): boolean {
  return path.startsWith(TITLE_PREFIX);
}

export function titledStdinKey(title: string): string {
  return `${TITLE_PREFIX}${title}`;
}
