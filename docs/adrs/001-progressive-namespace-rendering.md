# ADR-001: Progressive Namespace Rendering for `asb tree --stats`

**Date:** 2026-06-07  
**Status:** Accepted

## Context

`asb tree --stats` needs to fetch runtime message counts (active, dead-letter, scheduled) for each queue and subscription leaf node and display them inline. There are two ways the counts could be rendered:

- **Option A (stream section-by-section):** Render each section of the tree (queues, then each topic's subtree) as soon as its stats are available.
- **Option B (print-then-overwrite):** Render the full tree structure instantly, fetch all stats in parallel, then cursor-up and overwrite each leaf line with the count suffix.

## Decision

Use **Option A** — stream the tree section-by-section.

The implementation fetches in three stages:
1. Queue list + queue runtime properties + topic list — all in parallel (3 calls).
2. Print the queues section with counts immediately.
3. For each topic, fetch subscription list + subscription runtime properties in parallel (2 calls per topic), then print that topic's subtree with counts. Topics are processed sequentially to preserve rendering order and keep API concurrency low.

## Consequences

**Positive:**
- No ANSI cursor manipulation; works correctly at any terminal height.
- Low API concurrency — sequential per-topic processing reduces throttling risk without needing an explicit concurrency limiter.
- The Azure SDK's built-in retry (exponential backoff on HTTP 429) handles any throttling that does occur.
- Simple code path: interleaved fetch-and-print, no line-tracking state.

**Negative:**
- The tree appears in visible chunks (queues first, then topics one by one) rather than as a single atomic render. For namespaces with many topics, this is noticeable.
- Correct ├──/└── prefixes require knowing the total count of each sibling group upfront. This is satisfied naturally: the full queue list and full topic list are fetched before rendering begins; only the per-topic subscription fetch is deferred.

## Alternatives Considered

**Option B (print-then-overwrite)** was rejected because ANSI cursor positioning (`process.stdout.moveCursor`) breaks silently when the tree height exceeds the visible terminal. Detecting terminal overflow and falling back gracefully adds complexity without a meaningful UX benefit for typical namespace sizes.
