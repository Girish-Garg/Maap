# Keypad entry, PDF layout, storage delete, and PWA updates

Six fixes, grouped because they were reported together. Two are defects with
confirmed causes; four change behaviour that already worked but worked badly.

## 1. Logo delete fails against OCI

**Cause (confirmed from production logs).** `deletePrefix()` used
`DeleteObjectsCommand` — S3's batch delete. S3 requires a checksum header on
that operation, and AWS SDK v3 has defaulted to CRC32 since early 2025 (the
project is on 3.1121.0). OCI's S3 compatibility layer accepts Content-MD5,
SHA256, or CRC32C, but not plain CRC32, so it returns:

```
400 InvalidRequest: Missing required header for this request:
Content-MD5 or x-amz-checksum-sha256 or x-amz-checksum-crc32c
```

This also broke *replacing* a logo, because upload clears the folder first. Only
the very first upload worked, since deleting an empty prefix issues no call.

**Fix.** Delete keys individually with `DeleteObjectCommand`, which has no
required checksum. There is at most one file per user, so batching bought
nothing.

**Rejected:** forcing `ChecksumAlgorithm: "CRC32C"` or setting
`requestChecksumCalculation`. Both keep us coupled to SDK checksum internals
that have already changed once, and `WHEN_REQUIRED` would not help — batch
delete is exactly an operation where a checksum *is* required.

**Verification limit.** MinIO accepts both algorithms, so local testing proves
the code works but cannot prove the OCI behaviour. Real confirmation is a
delete against the live bucket.

## 2. Server Action errors are invisible in production

Next.js masks thrown Server Action messages in production builds, so
"Logo storage is not configured" reached the browser as a generic render error
and existed only in container logs.

**Fix.** The logo actions return a result value instead of throwing, following
the `AuthResult` pattern the login form already uses. Returned values are not
masked, so the real cause shows under the logo in Settings and is still logged.

## 3. "Project not found." crashes the page

A missing project threw, producing an error boundary rather than an explanation.
Reachable from a stale IndexedDB query cache still holding project IDs from the
pre-migration database, or a queued offline write replaying against a deleted
project.

**Fix.** The project detail view renders a "this project no longer exists"
state with a link back to the list, instead of surfacing a crash.

## 4. PWA will not update without reinstalling

**Cause.** Three layers each preferred the cached copy, and nothing could
invalidate them:

- `CACHE` is a fixed string, so `sw.js` bytes never change between deploys. The
  browser byte-compares, finds no difference, and never activates a new worker —
  so the `activate` handler that clears old caches never runs.
- Navigations were stale-while-revalidate returning `cached || fresh`, serving
  the old HTML.
- That old HTML references old `/_next/static/` hashes, and those were
  cache-first with no revalidation.

**Fix.** Navigations become network-first, falling back to cache only when the
fetch fails. Content-hashed assets stay cache-first — a new build produces new
filenames, so a cached entry is never stale. Fresh HTML then references new
chunk URLs, which miss the cache and are fetched. The cache name therefore stops
needing a per-deploy bump. Registration adds `updateViaCache: "none"` so `sw.js`
itself is never served from the HTTP cache, plus an explicit `update()` on load.

**Known limit.** Devices already wedged are still controlled by the old worker.
They need one manual clear of site data; this prevents recurrence rather than
retroactively fixing them.

## 5. Keypad: value should save without pressing Done

**Behaviour.** The number appears in the grid on the first digit, via the
existing optimistic cache update. The network write is debounced ~400ms so a
three-digit entry is one write rather than three — without it, each keystroke's
`onSettled` would invalidate and refetch the entries list. Committing also
happens immediately on Next, either jump, and on close, so nothing is lost to a
pending debounce.

**First keystroke replaces.** The keypad tracks whether the user has typed since
the cell opened. The first digit replaces the existing value; later digits
append. `4` → `1` gives `1`, then `2` gives `12`. Backspace and C count as
typing, so digits after them append. This fixes values concatenating to `41`.

## 6. Keypad layout

Done is removed, since committing is automatic. `Next` becomes the full-width
accent primary; `Next thickness` and `Next length` sit beneath as equal
secondary buttons. Closing is the backdrop or Esc.

The keypad is shared with the Pawa grid, which has no thickness axis, so the
secondary row takes a list of optional jumps (`{label, onJump}`) rather than
hard-coding Patia's. Patia passes two, Pawa passes one, and a button is omitted
when its jump does not exist (last thickness, last length).

Keyboard bindings are unchanged: Enter = Next, Esc = close, Tab = next length.

## 7. PDF header does not adapt to a sparse profile

With no logo and no contact lines the header kept its full height, leaving a
wide empty band, and fixed `marginTop` constants left the table stranded low on
the page.

**Fix.** A `headerTier(profile)` helper returns `full` / `compact` / `minimal`
from whether the logo and contact lines exist. Each tier carries its own spacing
scale; the rule's margin and the gaps above the parties block and the table come
from the tier rather than from constants. The left-right structure is identical
in all three, so adding a logo later does not change the document's character.

## Testing

- Logo delete re-verified against MinIO, and the failing operation removed.
- Keypad flows driven in the browser: digit appears without Done, first
  keystroke replaces, both jumps, Pawa's single jump.
- PDFs generated at all three tiers and inspected.
- Service worker checked against a production build: a navigation hits the
  network, and a rebuild is picked up without clearing storage.
- Existing suite (typecheck, lint, 25 calc tests) stays green.
