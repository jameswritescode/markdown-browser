import { join } from "node:path";

export const FIXTURES = join(import.meta.dirname, "fixtures", "docs");

export const FIX = (rel: string) => join(FIXTURES, rel);
