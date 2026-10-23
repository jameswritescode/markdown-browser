import { expect, test } from "vitest";
import { relativeTime } from "../src/page/time.ts";

const now = Date.UTC(2026, 9, 22, 12);
const ago = (ms: number) => relativeTime(now - ms, now);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test("formats recent and older times compactly", () => {
  expect(ago(10_000)).toBe("just now");
  expect(ago(5 * MIN)).toBe("5m ago");
  expect(ago(3 * HOUR)).toBe("3h ago");
  expect(ago(2 * DAY)).toBe("2d ago");
  expect(ago(7 * DAY)).toBe("1w ago");
  expect(ago(23 * DAY)).toBe("3w ago");
  expect(ago(65 * DAY)).toBe("2mo ago");
  expect(ago(800 * DAY)).toBe("2y ago");
});

test("future times read as just now", () => {
  expect(relativeTime(now + HOUR, now)).toBe("just now");
});
