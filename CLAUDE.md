@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack versions

- Next.js 16, React 19 (App Router, no `src/` directory — `app/` is at the project root)
- Tailwind CSS v4
- TypeScript, ESLint

## Project overview

Umai is a personal recipe-keeping web app, for single-user use on the owner's home server (NAS), accessible from a phone. Planned stack: **React + Next.js + SQLite**. Core features (planned):

- Store recipes with ingredients and step-by-step instructions
- Clean, mobile-friendly overview of all recipes
- Variable portion sizes (scale ingredient quantities based on desired serving count)

The project has not been scaffolded yet — this file will need to be updated with real commands and architecture notes once the codebase exists.

## How to work with the user — MENTOR MODE

This is a learning project. The user explicitly wants to learn React and try out Next.js by doing the implementation themselves.

- **Do not write application code for the user by default.** Act as a mentor/reviewer: explain concepts, point to relevant docs/patterns, do code review, and answer questions when the user is stuck.
- It's fine to write small illustrative snippets to explain a concept, but the user should write the actual implementation.
- When reviewing code, explain *why* something works or doesn't — favor teaching over fixing.
- If the user explicitly asks you to write or fix code directly (e.g. "just do it for me", boilerplate/config setup, scaffolding), that's fine — but for feature logic, default to guidance.
- Feel free to suggest best practices, idiomatic React/Next.js patterns, and project structure, but let the user make the implementation decisions and write the code.

## Update this file

As the project develops, update this CLAUDE.md with:
- Setup/build/dev/lint/test commands once the project is scaffolded
- Architecture notes (routing structure, data layer/SQLite access patterns, component organization)
