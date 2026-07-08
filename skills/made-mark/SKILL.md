---
name: made-mark
description: Applies Made Mark authorship labels (https://mademark.org) to deliverables Claude produces. Use whenever Claude creates a standalone piece of content the user might publish, share, or present — documents, articles, code files, images, presentations, or website copy. Not used for ordinary in-chat conversation or advice that isn't itself a deliverable.
---

# Made Mark

Made Mark is an open specification for content authorship disclosure
(https://mademark.org). It defines three marks:

- **Human Made** — the person wrote or created this themselves. Claude only
  discussed, reviewed, or gave feedback; no part of the delivered content
  came from Claude.
- **Human Designed, AI Made** — the person directed the intent, structure,
  goals, or constraints, and Claude generated the actual output.
- **AI Made** — Claude generated this with no specific human creative
  direction over this particular output (for example, a generic filler
  example the person didn't specify the content of).

The specification is CC0. The name, wordmark, and mark icons are trademarks
of Daniel Richard Skrok — see https://mademark.org/governance/ before
modifying or redistributing the marks themselves.

## When to apply a label

Apply a mark when the conversation produces something the person is likely
to publish, share, save, or present as finished work on its own:

- Documents, reports, essays, articles, blog posts
- Code files, scripts, components
- Presentations and slide decks
- Images or generated media
- Website or marketing copy

Do not apply a label to:

- Ordinary chat replies, explanations, or advice
- Brainstorming, outlines, or drafts explicitly marked as drafts
- Anything the person says they don't want labeled

If uncertain whether a mark applies, ask once rather than guessing.

## Choosing the right mark

Default to **Human Designed, AI Made** for anything Claude generated from
the person's direction — this is the common case for AI-assisted work.

Use **Human Made** only when Claude did not generate the delivered content
(e.g. Claude proofread or commented on the person's own writing).

Use **AI Made** only when there was no specific creative direction for this
output's content.

## Label format

Short form:
`MM · [Mark Name]`

Full form (include tool/provider when useful, e.g. in a colophon or footer):
`MM · [Mark Name] · [Model] · [Provider]`

Example: `MM · Human Designed, AI Made · Claude Sonnet 5 · Anthropic`

## Placement

- **Documents (docx, md, articles):** final line or a footer/colophon.
- **Code files:** a single comment line near the top of the file.
- **Presentations:** final slide, small footer text.
- **Web/HTML output:** footer, plus optionally the JSON-LD snippet from
  https://mademark.org/generate/ in the `<head>`.
- **Images, video, and other binary media (Claude Code only):** don't stop
  at a caption. Run `scripts/embed-mark.sh` to embed the mark as real,
  machine-readable XMP metadata inside the file itself — see "Embedding
  metadata in media files" below.

## Embedding metadata in media files (Claude Code only)

Claude Code has filesystem and shell access, so when a deliverable is a
binary media file (image, video, PDF) that ends up saved to disk, embed the
mark directly instead of only mentioning it in a caption:

```
scripts/embed-mark.sh <file> <mark-slug> [model] [provider] [source-license]
```

- `<mark-slug>` is `human-made`, `human-designed-ai-made`, or `ai-made`.
- Requires ExifTool (`brew install exiftool` / `apt-get install libimage-exiftool-perl`).
  If it isn't installed, tell the user once and fall back to a caption/note
  instead of failing silently.
- This writes the same fields as the XMP block documented at
  https://mademark.org/downloads/ ("For developers"), scoped under the
  `https://mademark.org/ns/` namespace — any XMP-aware tool can read it back,
  not just this script.

This does not apply on Claude.ai (chat has no file/shell access) — there,
fall back to the caption/metadata note described above.

## What not to do

- Don't relabel or remove a mark the person already applied themselves.
- Don't claim Human Made for content Claude substantively generated.
- Don't modify the Made Mark icons/wordmark if inserting the visual badge —
  link to https://mademark.org/marks/ instead of recreating the graphics.
