import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type { StdinDoc } from "../shared/types.ts";

import { STDIN_PREFIX, titledStdinKey } from "../shared/stdin-key.ts";

export type { StdinDoc };
export { STDIN_PREFIX, isStdinKey, isTitledStdinKey } from "../shared/stdin-key.ts";

/** A titled key is the same for every pipe with that title, so a later pipe finds the tab. */
export function stdinKey(title: string | null): string {
  return title === null ? `${STDIN_PREFIX}${randomUUID()}` : titledStdinKey(title);
}

/** Holds stdin documents in memory only. Nothing is written to disk. */
export class StdinStore {
  private docs = new Map<string, StdinDoc>();

  put(key: string, doc: StdinDoc): void {
    this.docs.set(key, doc);
  }

  get(key: string): StdinDoc | null {
    return this.docs.get(key) ?? null;
  }

  has(key: string): boolean {
    return this.docs.has(key);
  }

  forget(key: string): void {
    this.docs.delete(key);
  }
}

/** The file path a stdin document renders as, so that relative URLs resolve. */
export function docPathFor(doc: StdinDoc): string {
  return join(doc.base, "stdin.md");
}
