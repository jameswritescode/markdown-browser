<!--
This is not a skill on its own. `mdb skill install` puts this note at the top of the Codex copy
of SKILL.md (~/.codex/skills/mdb/SKILL.md), after the frontmatter. The Claude Code copy does not
get it. mdb removes this comment when it installs the note.
-->

## Codex: run mdb with escalated permissions

Run every `mdb` command with escalated permissions. When you ask for them, give this reason: mdb
must script the user's terminal to find their pane and open a pane beside it, and it must
connect to a socket in `~/.local/state/mdb` to reach an mdb that is open. The Codex sandbox
stops these actions, so without escalated permissions mdb fails.

If the user does not give the permissions, do not try again. Tell the user the full `mdb`
command, and ask them to run it in their terminal.
