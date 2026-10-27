import { expect, test } from "vitest";
import { tabLabels } from "../src/page/tab-labels.ts";

test("a tab shows its file name", () => {
  expect(tabLabels([{ path: "/r/plan.md", root: "/r" }])).toEqual(["plan.md"]);
});

test("tabs with the same file name add their folder", () => {
  expect(
    tabLabels([
      { path: "/r/api/plan.md", root: "/r/api" },
      { path: "/r/web/plan.md", root: "/r/web" },
      { path: "/r/spec.md", root: "/r" },
    ]),
  ).toEqual(["plan.md · api", "plan.md · web", "spec.md"]);
});

test("a tab on its finder shows the folder", () => {
  expect(tabLabels([{ path: null, root: "/x/docs" }])).toEqual(["Files · docs"]);
});
