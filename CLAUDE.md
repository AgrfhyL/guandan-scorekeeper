# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

掼蛋记分 Lite — a lightweight **scorekeeper** (not a card-play engine) for single-day 掼蛋 (Guandan)
events. Players play with physical cards; the app records each hand's finishing order
(头游/二游/三游/末游) plus a 抗贡 flag, and *derives* everything else: level progression, 进贡 display,
打A three-chance logic, per-round team score, and per-player daily leaderboards.

Authoritative specs live in the repo root:
- `掼蛋规则.pdf` — game rules (upgrade rules, 进贡/抗贡, 打A机制, scoring formula).
- `掼蛋记分产品设计需求书 202606.pdf` — product spec v0.1 (25 sections; UI, flows, acceptance §24).

The full approved implementation plan is at
`/Users/agrfhyl/.claude/plans/pdf-202606-pdf-i-declarative-nygaard.md`.

## Stack

TypeScript end-to-end · React 18 + Vite + Tailwind (mobile-first PWA) · Zustand (local match state) +
TanStack Query (sync/polling) · React Router · **Supabase** (Postgres + auto REST + Edge Functions) ·
**Vercel** hosting · `html-to-image` for JPG long-image export · Vitest (engine) + Playwright (smoke).

## Commands

(Set up during scaffold; expected scripts)
- `npm install` — install deps
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm test` / `npx vitest run` — run the rules-engine test suite
- `npx vitest run src/rules-engine/__tests__/upgrade.test.ts` — run a single test file
- `npx vitest -t "双下"` — run tests matching a name

## Architecture — the big picture

**The rules engine is the heart and must be built/tested first.** It lives in `src/rules-engine/`
as **pure functions with no I/O** (no React, no DB). UI and sync are thin layers over it.

Key principle — **derive, don't store**: the only source-of-truth input per hand is the 4 ranks,
the 抗贡 toggle, and (hand #1 only) the 先发方. Levels, 进贡 descriptors, results, scores, and all
aggregates are recomputed from the ordered list of hands. This is why editing a past hand correctly
recomputes the whole chain (spec §10).

Engine modules:
- `types.ts` — shared types (also used by the Supabase layer).
- `levels.ts` — level ladder 2..A as numbers 2..14.
- `upgrade.ts` — per-hand outcome → leading team + next level (双上+3 / 单上+2 / 单下+1 / 双下 opp+3, no demote).
- `passA.ts` — the A1/A2/A3 three-chance state machine, including the two special A3 cases (encode
  exactly as the table in 规则 §二.7).
- `tribute.ts` — 进贡 descriptor (display only; the app does NOT know cards) + 抗贡 team attribution.
- `scoring.ts` — round score `winner = 52 + 4×(winner_level − loser_level)`, `loser = 100 − winner`.
- `aggregates.ts` — daily per-player stats and 今日总览 (completed rounds only; incomplete excluded everywhere).

Data flows: Zustand store holds the in-memory match optimistically → debounced autosave to Supabase →
spectators poll every 10s. Supabase RLS gates writes by password + a single-editor lock (Edge Function
`acquireLock`); cloud records are purged by `pg_cron` 3 days after a match ends.

## Conventions / gotchas

- **Never render 东/南/西/北 as text** — seats are internal only; team = opposite seats, shown via
  low-saturation blue/red (spec §22).
- One **shared 进贡 render rule** must be reused by the green table, round table, leaderboard detail,
  and export image (spec §10) — don't duplicate it.
- Score colon spacing is literal: `蓝3 : 红5` (spaces around the colon).
- **Same player name within a match = same player** (auto-merge); rename to a new name = new player (§4).
- Mobile constraints (§21): no horizontal scroll, inputs ≥16px, rank entry must NOT trigger the
  keyboard, nav clears the iPhone safe area.
- Build order is a gate: rules-engine + green Vitest suite before any UI work.
