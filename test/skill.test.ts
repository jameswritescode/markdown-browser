import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { installSkill, renderSkill, SKILL_MARKER } from "../src/cli/skill.ts";

const TEMPLATE = "---\nname: mdb\ndescription: Show markdown.\n---\n\nBody text.\n";
const CODEX = "Run mdb with escalated permissions.\n";

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "mdb-skill-"));
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

test("renders the marker after the frontmatter, and the Codex note for Codex", () => {
  expect(renderSkill(TEMPLATE, null)).toBe(
    `---\nname: mdb\ndescription: Show markdown.\n---\n\n${SKILL_MARKER}\n\nBody text.\n`,
  );
  expect(renderSkill(TEMPLATE, CODEX)).toBe(
    `---\nname: mdb\ndescription: Show markdown.\n---\n\n${SKILL_MARKER}\n\n${CODEX}\nBody text.\n`,
  );
});

test("installs the skill for Claude Code and Codex", () => {
  const results = installSkill(home, TEMPLATE, CODEX);
  expect(results).toEqual([
    { agent: "Claude Code", path: join(home, ".claude/skills/mdb/SKILL.md"), status: "installed" },
    { agent: "Codex", path: join(home, ".codex/skills/mdb/SKILL.md"), status: "installed" },
  ]);
  expect(readFileSync(results[0]!.path, "utf8")).toBe(renderSkill(TEMPLATE, null));
  expect(readFileSync(results[1]!.path, "utf8")).toBe(renderSkill(TEMPLATE, CODEX));
});

test("updates a skill that mdb wrote", () => {
  installSkill(home, TEMPLATE, CODEX);
  const newer = TEMPLATE.replace("Body text.", "New body.");
  const results = installSkill(home, newer, CODEX);
  expect(results.map((r) => r.status)).toEqual(["updated", "updated"]);
  expect(readFileSync(results[0]!.path, "utf8")).toContain("New body.");
});

test("leaves a skill that mdb did not write", () => {
  const path = join(home, ".claude/skills/mdb/SKILL.md");
  mkdirSync(join(home, ".claude/skills/mdb"), { recursive: true });
  writeFileSync(path, "my own skill\n");
  const results = installSkill(home, TEMPLATE, CODEX);
  expect(results[0]).toEqual({ agent: "Claude Code", path, status: "skipped" });
  expect(readFileSync(path, "utf8")).toBe("my own skill\n");
  expect(results[1]!.status).toBe("installed");
});
