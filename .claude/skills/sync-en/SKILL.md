---
name: sync-en
description: Update the English content (data/en) from the Spanish source (data/es) - translates only what changed in Spanish and keeps both languages structurally identical. Use when the user runs /sync-en, or asks to update/translate the English version of the portfolio.
argument-hint: "[file or section, e.g. skills]"
---

# Sync English from Spanish

`data/es` is the source of truth; `data/en` is its translation (see `CLAUDE.md`).
Never edit `data/es` in this skill.

## Arguments (optional)
- A file or section name (`about`, `skills`, `experiences`, `site`...): sync only that one.
  Default: everything that differs.

## Steps
1. **Find what changed in Spanish.**
   - Uncommitted changes: `git diff -- data/es` and `git status --short data/es`
     (new files show as `??`).
   - If there are none, compare against `main`: `git diff main -- data/es`.
   - Compare the file lists: `diff <(cd data/es && find . -type f | sort) <(cd data/en && find . -type f | sort)`.
     A Spanish file with no English counterpart must be created; an English file with no
     Spanish counterpart must be reported, not deleted.
2. **Read each changed Spanish file and its English counterpart in full.**
3. **Update the English file so it mirrors the Spanish one:**
   - Same entries, same order, same structure and Markdown formatting (lists, `**bold**`,
     line breaks).
   - Translate only the text that changed; leave untouched English text as it is.
   - Do not translate: YAML keys, `id`, `icon`, `template`, `weight`, URLs, dates,
     company and product names, technology names.
   - Values that are language-specific on purpose stay different: `section.name`
     (navbar label), resume links (`CV_..._EN.pdf` vs `CV_....pdf`), "My Resume" / "Mi CV",
     the `openGraph.url` (`/` vs `/es/`).
   - Natural professional English (a portfolio/CV), not word-for-word translation.
4. **Do not silently fix the Spanish source.** If the Spanish text has typos or
   inconsistencies (e.g. a role that no longer matches the rest), translate correctly
   and list them in the report for Alicia to decide.
5. **Check the result:**
   - YAML still parses: `hugo --quiet --renderToMemory` (no errors).
   - Run the `/mobile-check` skill on `/` (English) for the sections touched.
6. **Report to Alicia in Spanish**: files updated, what changed in each one (short),
   anything left out on purpose, and issues found in the Spanish source.
   Do not commit.
