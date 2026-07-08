# Made Mark — Claude Skill

Teaches Claude to automatically apply [Made Mark](https://mademark.org)
authorship labels to content it produces for you.

## Install — Claude Code

```
mkdir -p ~/.claude/skills/made-mark
curl -o ~/.claude/skills/made-mark/SKILL.md \
  https://raw.githubusercontent.com/mademark/mademark.org/main/skills/made-mark/SKILL.md
```

Personal install applies across all your projects. For a single project
instead, use `.claude/skills/made-mark/` in the repo root and commit it so
your team gets it too.

## Install — Claude.ai (Pro/Max/Team/Enterprise)

Claude.ai supports custom skills in Settings → Capabilities → Skills.
Download `SKILL.md` from this repo and upload it there.

## Verify

Ask Claude to draft something (a short doc, a code snippet) and check that
it appends a `MM · Human Designed, AI Made · ...` line. If it doesn't,
confirm the skill loaded — in Claude Code, `/skills` lists active skills.

## Media files (images, video, PDF)

Custom instructions and system prompts only shape the model's own text
output — they can't reach into a binary file's bytes. So for images, video,
or PDFs, this skill includes `scripts/embed-mark.sh`, which uses
[ExifTool](https://exiftool.org) to embed the mark as real XMP metadata in
the file itself (not just a visible caption):

```
scripts/embed-mark.sh <file> <mark-slug> [model] [provider] [source-license]
```

Requires ExifTool: `brew install exiftool` (macOS) or
`apt-get install libimage-exiftool-perl` (Debian/Ubuntu).

This only works where the AI has filesystem and shell access — i.e. Claude
Code today. Claude.ai's chat interface can't touch local files, so it falls
back to noting the mark in a caption.

## Scaling beyond Claude — phased plan

`embed-mark.sh` has no Claude-specific dependency — it's a plain CLI. The
dividing line for who can use it isn't the model, it's whether the platform
can execute local commands. Rather than one big cross-platform push, this
rolls out in phases so each step ships something usable on its own, and
leaves room to react to a landscape that isn't static — C2PA and the EU AI
Act (Article 50 transparency obligations) are both moving in this space.

- **Phase 1 — done.** Claude, text labels via custom instructions/skill,
  plus real XMP embedding for media through `embed-mark.sh` in Claude Code.

- **Phase 2 — other agentic/CLI tools.** Anything that can shell out
  (Cursor, other Claude Code-alikes, an OpenAI Codex-style CLI) can call
  the same script from its own rules/instructions file. No changes needed
  to the script itself — just a rules-file adapter per tool, same pattern
  as `SKILL.md`.

- **Phase 3 — chat-only platforms.** ChatGPT web, Gemini web, and Claude.ai
  chat can't run local commands, so they can't self-embed. Realistic path
  here is a separate desktop helper or browser extension the user runs
  manually against downloaded output — not a skill/instructions file,
  because there's no execution surface to hook into from inside the chat.

- **Phase 4 — C2PA interoperability.** Don't compete with C2PA; ride
  inside it. Made Mark is meant to be a human-readable semantic layer a
  C2PA manifest can carry (see the C2PA assertion example at
  https://mademark.org/generate/). Adding this to `embed-mark.sh` needs a
  signing certificate via `c2patool`, which is a real prerequisite — unlike
  XMP, an unsigned C2PA assertion has little value, so this phase is gated
  on setting up signing infrastructure, not just writing more script.

- **Phase 5 — regulatory alignment.** Track what the EU AI Act and similar
  disclosure mandates end up requiring in practice, so Made Mark's
  vocabulary maps onto whatever legally required format emerges instead of
  becoming a second, incompatible label. This is a watch-and-adapt phase,
  not a build phase — revisit once actual compliance requirements (not
  draft guidance) land.

## What this does *not* do

This skill does not modify, package, or claim rights to the Made Mark name
or marks. The specification is CC0; the marks are trademarked — see
https://mademark.org/governance/.
