import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const SKILL_MARKER =
  "<!-- Written by `mdb skill install`. Run it again to update this file. -->";

const AGENTS = [
  { agent: "Claude Code", dir: ".claude/skills/mdb", codex: false },
  { agent: "Codex", dir: ".codex/skills/mdb", codex: true },
] as const;

export interface SkillResult {
  agent: string;
  path: string;
  status: "installed" | "updated" | "skipped";
}

export function renderSkill(template: string, note: string | null): string {
  const end = template.indexOf("\n---\n", 4);
  if (!template.startsWith("---\n") || end < 0)
    throw new Error("skill template has no frontmatter");
  const head = template.slice(0, end + 5);
  const body = template.slice(end + 5).replace(/^\n+/, "");
  // A comment at the top of the note is for whoever edits it, not for the agent.
  const text = note?.replace(/^<!--[\s\S]*?-->\s*/, "");
  return `${head}\n${SKILL_MARKER}\n\n${text ? `${text}\n` : ""}${body}`;
}

export function installSkill(home: string, template: string, codexNote: string): SkillResult[] {
  return AGENTS.map(({ agent, dir, codex }) => {
    const path = join(home, dir, "SKILL.md");
    const existed = existsSync(path);
    if (existed && !readFileSync(path, "utf8").includes(SKILL_MARKER))
      return { agent, path, status: "skipped" };
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, renderSkill(template, codex ? codexNote : null));
    return { agent, path, status: existed ? "updated" : "installed" };
  });
}
