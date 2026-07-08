# Made Mark — Claude Skill

Teaches Claude to add a [Made Mark](https://mademark.org) authorship label
to the documents, articles, reports, and code files it writes for you — so
readers can tell how the content was made.

This is a convenience wrapper around the same approach documented at
[mademark.org/use-with-ai](https://mademark.org/use-with-ai/). If you'd
rather not install anything, that page has copy-paste custom instructions
that do the same thing.

## Install — Claude Code

```
mkdir -p ~/.claude/skills/made-mark
curl -o ~/.claude/skills/made-mark/SKILL.md \
  https://raw.githubusercontent.com/mademark/mademark.org/main/skills/made-mark/SKILL.md
```

A personal install applies across all your projects. For a single project
instead, put `SKILL.md` at `.claude/skills/made-mark/SKILL.md` in the repo
root and commit it so your team gets it too.

## Install — Claude.ai (Pro/Max/Team/Enterprise)

Claude.ai supports custom skills under Settings → Capabilities → Skills.
Download `SKILL.md` from this folder and upload it there.

## Verify it works

Ask Claude to draft something publishable — a short doc, an article, a code
file — and check that it appends a line like:

```
MM · Human Designed, AI Made
Learn more: https://mademark.org
```

If it doesn't appear, confirm the skill loaded (in Claude Code, `/skills`
lists active skills). It's meant to stay quiet during ordinary chat — it
only labels finished, shareable deliverables, not every reply.

## Images, video, and audio

This skill labels text. A visible caption on a media file gets stripped the
moment the file is re-shared, so images/video/audio need the label written
*inside the file's metadata* — which a language model can't do to raw
bytes. Use the free browser tools instead, which run entirely on your
device and produce files the [verifier](https://mademark.org/verify/) can
read back:

- **Images** — https://mademark.org/label/images/
- **Video** — https://mademark.org/label/video/
- **Audio** — https://mademark.org/label/audio/

## What this does *not* do

This skill does not modify, package, or claim rights to the Made Mark name
or marks. The specification is CC0; the name, wordmark, and icons are
trademarks of Daniel Richard Skrok — see
[mademark.org/governance](https://mademark.org/governance/).
