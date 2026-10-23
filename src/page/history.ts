export class History<T> {
  private entries: T[] = [];
  private index = -1;

  push(entry: T): void {
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push(entry);
    this.index = this.entries.length - 1;
  }

  replace(entry: T): void {
    if (this.index >= 0) this.entries[this.index] = entry;
  }

  back(): T | null {
    if (!this.canBack) return null;
    return this.entries[--this.index]!;
  }

  forward(): T | null {
    if (!this.canForward) return null;
    return this.entries[++this.index]!;
  }

  get current(): T | null {
    return this.entries[this.index] ?? null;
  }

  get canBack(): boolean {
    return this.index > 0;
  }

  get canForward(): boolean {
    return this.index < this.entries.length - 1;
  }
}
