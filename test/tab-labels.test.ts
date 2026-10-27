import { expect, test } from "vitest";
import { tabLabels } from "../src/page/tab-labels.ts";

test("a tab shows its document's title, as the file list does", () => {
  expect(tabLabels([{ path: "/r/plan.md", root: "/r", title: "Tabs plan" }])).toEqual([
    "Tabs plan",
  ]);
});

test("a tab with no title yet shows its file name", () => {
  expect(tabLabels([{ path: "/r/plan.md", root: "/r", title: null }])).toEqual(["plan.md"]);
});

test("tabs with the same title add the file name, then the folder", () => {
  expect(
    tabLabels([
      { path: "/r/api/plan.md", root: "/r/api", title: "Plan" },
      { path: "/r/web/plan.md", root: "/r/web", title: "Plan" },
      { path: "/r/notes.md", root: "/r", title: "Plan" },
      { path: "/r/spec.md", root: "/r", title: "Spec" },
    ]),
  ).toEqual(["Plan · api", "Plan · web", "Plan · notes.md", "Spec"]);
});

test("a tab on its finder shows the folder", () => {
  expect(tabLabels([{ path: null, root: "/x/docs", title: null }])).toEqual(["Files · docs"]);
});
