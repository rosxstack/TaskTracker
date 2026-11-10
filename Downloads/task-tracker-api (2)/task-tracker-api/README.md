# Task Tracker API

A REST API to track what you need to do, what you're working on, and what's done.
Built with **Node.js** and **Express**. Tasks are stored in a `tasks.json` file in the
directory you start the server from (created automatically if missing). No database needed.

## Quick start

Requires Node.js 18+.

```bash
npm install
npm start            # or: npm run dev  (auto-reload)
```

The API runs on http://localhost:3000. Run the tests with `npm test`.

Optional environment variables: `PORT` (default `3000`) and `TASKS_FILE`
(default `./tasks.json`).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/tasks` | Add a task: `{ "description": "Buy groceries" }` |
| GET | `/tasks` | List all tasks |
| GET | `/tasks?status=todo` | Filter: `todo`, `in-progress`, `done`, or `not-done` |
| GET | `/tasks/:id` | Get one task |
| PATCH | `/tasks/:id` | Update `description` and/or `status` |
| DELETE | `/tasks/:id` | Delete a task (204) |
| GET | `/health` | Health check |

## Examples

```bash
# Add
curl -X POST localhost:3000/tasks -H 'Content-Type: application/json' \
  -d '{"description":"Buy groceries"}'

# Update description
curl -X PATCH localhost:3000/tasks/1 -H 'Content-Type: application/json' \
  -d '{"description":"Buy groceries and cook dinner"}'

# Mark in progress / done
curl -X PATCH localhost:3000/tasks/1 -H 'Content-Type: application/json' -d '{"status":"in-progress"}'
curl -X PATCH localhost:3000/tasks/1 -H 'Content-Type: application/json' -d '{"status":"done"}'

# List
curl localhost:3000/tasks
curl 'localhost:3000/tasks?status=not-done'

# Delete
curl -X DELETE localhost:3000/tasks/1
```

## Task format

```json
{
  "id": 1,
  "description": "Buy groceries",
  "status": "todo",
  "createdAt": "2026-11-10T12:26:08.334Z",
  "updatedAt": "2026-11-10T12:26:08.334Z"
}
```

`status` is `todo` (default), `in-progress` or `done`. `updatedAt` changes on every update.

## How storage works

- Uses Node's built-in `fs` module; the only dependency is Express.
- Requests are processed one at a time, so parallel requests can't overwrite each other.
- Writes go to a temp file that is then renamed, so a crash can't leave a half-written file.
- If `tasks.json` contains invalid JSON, the server refuses to start rather than overwrite it.

## Errors

Errors return JSON like `{ "error": "..." }` with status `400` (bad input, invalid ID,
invalid JSON), `404` (task or route not found) or `500` (unexpected).

## Project structure

```
src/server.js        start-up
src/app.js           Express app and error handling
src/store.js         JSON file storage
src/routes/tasks.js  task endpoints
test/                integration tests (node:test)
```
