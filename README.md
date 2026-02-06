# Task Planner (OpenRouter + Gemini 3 Flash Preview)

A single-user web app that turns a task objective into logical, trackable steps.

## Features

- Create tasks from a natural-language objective.
- Generate ordered steps using OpenRouter.
- Default model policy: primary Gemini 3 Flash Preview, single fallback to Gemini 2.5 Flash.
- Store tasks, steps, and per-task chat in SQLite.
- Toggle task and step completion.
- Edit/add/delete steps and drag to reorder.
- Open each task in a dedicated detail page.
- Chat per task to iteratively refine the plan and apply suggested steps.

## Environment Variables

Copy `.env.example` to `.env` and set values:

- `OPENROUTER_API_KEY` (required)
- `OPENROUTER_MODEL_PRIMARY` (optional, defaults to `google/gemini-3-flash-preview`)
- `OPENROUTER_MODEL_FALLBACK` (optional, defaults to `google/gemini-2.5-flash`)
- `DATABASE_URL` (SQLite path; default `file:./dev.db`)

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create database and Prisma client:

```bash
npx prisma migrate dev --name init
```

3. Start dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm run test
```

## API Notes

AI-backed endpoints return `modelUsed` as `"primary"` or `"fallback"`:

- `POST /api/tasks`
- `POST /api/tasks/:taskId/chat`
