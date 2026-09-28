# ADR 0001: Keep `creations.content` as `String` during Prisma adoption; defer JSON migration

## Status
Accepted — deferred, tracked for future work

## Context
While introducing Prisma via `npx prisma db pull` against the existing Neon database,
we considered modeling the `creations.content` column as Prisma's `Json` type instead
of `String`, since it maps naturally to Postgres `jsonb` and would give real structure
to resume-review data.

The column currently holds different shapes depending on `creations.type`:

- `type = 'article' | 'blog-title' | 'image'` → `content` is a plain string
  (an article body, a title, or a raw Cloudinary URL)
- `type = 'resume'` → `content` is a JSON object, currently stored via
  `JSON.stringify()` before insert

This means changing the column's type is not a Prisma-config-only change — it is a
live schema + data migration, because:

- A raw `content::jsonb` cast fails on the non-resume rows (`invalid input syntax for
  json`), since a bare string like a URL is not valid JSON on its own.
- Wrapping with `to_jsonb(content)` instead would fix the non-resume rows (producing a
  JSON string scalar) but would **double-encode** the resume rows, which are already
  JSON text — turning a JSON object into a JSON string containing JSON text.
- There is no single cast that is correct for every row; the two categories of data
  need different treatment, which requires a conditional backfill, not a type
  annotation.

## Decision
For the initial Prisma introspection/adoption pass, `content` stays `String`,
matching what `db pull` reflects from the live column. We are not bundling an
unrelated data migration into the "adopt Prisma" change, so that if something breaks
afterward, it's clear whether the tooling change or a data change caused it.

The migration to a properly typed `Json`/`jsonb` column is deferred to a dedicated,
separate piece of work.

## Consequences
**Now:**
- Prisma Client is fully typed for every other column; `content` remains an untyped
  string on the TypeScript side, so consumers still parse/guess based on `type` —
  this is unchanged debt, not new debt.
- No risk of data corruption or downtime introduced by this Prisma adoption pass.

**Deferred, but tracked:**
- Resume data (and eventually image/article metadata) can't be queried or indexed as
  structured JSON until this migration happens.
- The `content` column will keep needing type-specific parsing at every read site
  until it's resolved.

## Alternatives considered
- **Cast directly to `jsonb` now** (`ALTER COLUMN content TYPE jsonb USING
  content::jsonb`) — rejected: fails immediately on non-resume rows.
- **Wrap everything with `to_jsonb(content)`** — rejected: fixes non-resume rows but
  double-encodes resume rows; would need a `CASE WHEN type = 'resume' THEN
  content::jsonb ELSE to_jsonb(content) END`-style conditional anyway, which is a real
  migration script, not a one-line type change.
- **Do it now, as part of Prisma adoption** — rejected: couples a routine tooling
  change to a riskier data migration, making failures harder to diagnose.

## Future work — how to revisit this
When ready, migrate using the expand–contract pattern instead of a single blocking
`ALTER TYPE`, so the app keeps working at every step:

1. **Expand** — add a new nullable column, `content_json JSONB`, alongside `content`.
2. **Backfill** — script converts each row into properly-typed JSON per its `type`
   (decide the target shape for non-resume rows, e.g. `{"url": "..."}` for images,
   `{"text": "..."}` for articles/titles, vs. keeping resume rows as real objects),
   writing into `content_json`. Batch if the table is large.
3. **Switch** — update all read/write paths to use `content_json`, deploy, verify in
   production.
4. **Contract** — once confident, drop `content`, rename `content_json` → `content`.

Trigger for revisiting: when resume/image data needs to be queried or filtered by
structure (e.g. "find all resumes with an ATS score below X"), or when JD-matching
data (Lesson roadmap, Stage 1) is added and needs real structured storage.
