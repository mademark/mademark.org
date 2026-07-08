# Made Mark

**An open specification for content authorship disclosure.**

Made Mark answers a question no existing specification addresses: *how was this
content made?* A Creative Commons license tells you what you can do with
content. C2PA tells you whether a file is untampered. Made Mark tells you who
— or what — made it, in words anyone can read.

It's built on the same three-layer architecture as a CC license — a visual
mark, a plain-language label, and a machine-readable expression — and is
designed to travel inside C2PA manifests as a human-readable semantic layer.
Standalone use without C2PA is also supported.

**Live site:** [mademark.org](https://mademark.org)

## The three marks

| Mark | Meaning |
|---|---|
| **Human Made** | Conceived and produced by people. No AI tools involved in the creative work itself. |
| **Human Designed, AI Made** | Human creative direction, AI production. A person shaped the intent — AI produced the artifact. |
| **AI Made** | Conceived and produced primarily by AI, with no human creative direction for the specific output. |

Full definitions: [mademark.org/marks](https://mademark.org/marks/)

## What's in this repo

This repo is the source for mademark.org — a static site, no build step,
no framework.

```
index.html            Overview / spec summary
marks/                 The three marks + machine-readable index.json per mark
label/                 "Label your work" hub + format tools:
  use-with-ai/           custom-instructions setup for Claude, ChatGPT, Copilot, Gemini
  generate/              manual label generator (web / image / C2PA / badge output)
  label/images/          JPEG/PNG XMP labeler (client-side)
  label/video/           end-card generator (client-side)
  label/audio/           MP3 ID3 tag labeler (client-side)
  label/physical/        marking-kit + QR tag generator for physical goods
implement/             developer docs: JSON-LD / XMP / C2PA schemas, stable URIs
verify/                drop a file, read its Made Mark label + C2PA credentials
downloads/             brand assets (icons, logo, asset pack)
governance/, about/, colophon/
assets/js/mm-xmp.js    shared XMP-embedding library used by the format tools
ns/index.json          JSON-LD context
```

Every format tool runs entirely client-side — files never leave the browser.

## Running locally

```
ruby server.rb
```

Serves the site at `http://localhost:3456` (respects a `PORT` env var). No
dependencies beyond Ruby's standard library (WEBrick).

## License

Made Mark uses a split model, the same approach Creative Commons uses for its
own work:

- **The specification** (vocabulary, label syntax, URI structure, JSON-LD
  context) — **CC0**, public domain. Implement it without asking.
- **The mark icons** — **CC BY-ND 4.0**. Free to use unmodified to identify
  Made Mark authorship on content. Do not modify, recolor, or repurpose them
  outside that context.
- **The name "Made Mark" and the [m] wordmark** are trademarks of Daniel
  Richard Skrok. You don't need permission to use a Made Mark label on your
  content — you may not use the name or logo to represent a competing or
  derivative specification.

See [LICENSE.md](LICENSE.md) and [mademark.org/governance](https://mademark.org/governance/)
for the full policy, including misuse handling and how stewardship could
transfer to a standards body.

## Contact

hello@mademark.org
