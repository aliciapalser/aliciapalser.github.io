---
name: mobile-check
description: Check how the portfolio looks on a phone (390px iPhone emulation) - screenshots plus automatic detection of horizontal scroll, overflowing elements, hero height and console errors. Use when the user runs /mobile-check, asks to review the mobile view, or after a visual/CSS change to the site.
argument-hint: "[section] [en|es] [full]"
---

# Mobile check

Review the portfolio as it renders on a phone, using the Chrome DevTools Protocol
script next to this file. Do not use `chrome --headless --window-size=390,...`: headless
Chrome enforces a minimum window width and the result is not a faithful phone view.

## Arguments (all optional, any order)
- **section**: an anchor id to scroll to before the screenshot: `about`, `skills`,
  `experiences`, `projects`, `education`.
- **language**: `en` (`/`) or `es` (`/es/`). Default: both.
- **full**: full-page screenshot instead of only the visible screen.

## Steps
1. **Make sure the site is being served.** Check `curl -s -o /dev/null -w '%{http_code}' http://localhost:1313/`.
   If it does not answer 200, start it in the background from the repo root:
   `hugo server -w --port 1313 --logLevel error`, then wait until it answers.
   If a folder like `assets/` or `static/` was created after the server started,
   restart it: Hugo does not watch new top-level folders.
2. **Run the script** once per language, saving screenshots to the session scratchpad
   (never inside the repo):
   ```
   node .claude/skills/mobile-check/mobile-check.mjs --url http://localhost:1313/es/ --out <scratchpad>/mobile-check [--section skills] [--full]
   ```
   Optional: `--width` / `--height` to emulate another device (default 390x844).
3. **Read the JSON report and the screenshot(s)** (Read tool on the PNG path printed
   in `screenshot`).
4. **Report to Alicia in Spanish**:
   - What looks good.
   - Problems, with evidence from the screenshot or the JSON:
     - `horizontalScroll: true` / `overflowingElements`: content wider than the screen
       (the page can be dragged sideways on a phone). `layoutViewportWidth` larger
       than the viewport width is the same symptom.
     - `consoleErrors`: JavaScript errors or missing files (404).
     - Cut-off text, cramped or excessive spacing, unreadable sizes.
   - A proposed fix. Custom CSS goes in `assets/styles/override.scss` (see `CLAUDE.md`).
     **Do not apply fixes without asking.**

## Requirements
Google Chrome in `/Applications` (or `CHROME_PATH`), Node >= 22, Hugo.
