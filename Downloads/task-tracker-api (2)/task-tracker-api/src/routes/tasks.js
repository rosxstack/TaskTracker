import express from 'express';
import * as store from '../store.js';

const router = express.Router();

const STATUSES = ['todo', 'in-progress', 'done'];

// Small helper so async errors reach the error handler.
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    badRequest(res, `'${req.params.id}' is not a valid task ID`);
    return null;
  }
  return id;
}

const validDescription = (value) =>
  typeof value === 'string' && value.trim().length > 0;

// POST /tasks  { "description": "Buy groceries" }
router.post(
  '/',
  wrap(async (req, res) => {
    const { description } = req.body || {};
    if (!validDescription(description)) {
      return badRequest(res, 'description is required and must be a non-empty string');
    }
    res.status(201).json(await store.create(description.trim()));
  })
);

// GET /tasks?status=todo|in-progress|done|not-done
router.get(
  '/',
  wrap(async (req, res) => {
    const { status } = req.query;
    if (status !== undefined && status !== 'not-done' && !STATUSES.includes(status)) {
      return badRequest(
        res,
        `status must be one of: ${[...STATUSES, 'not-done'].join(', ')}`
      );
    }
    res.json(await store.list(status));
  })
);

// GET /tasks/:id
router.get(
  '/:id',
  wrap(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const task = await store.get(id);
    if (!task) return res.status(404).json({ error: `Task ${id} not found` });
    res.json(task);
  })
);

// PATCH /tasks/:id  { "description"?: "...", "status"?: "in-progress" }
router.patch(
  '/:id',
  wrap(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;

    const { description, status } = req.body || {};
    if (description === undefined && status === undefined) {
      return badRequest(res, 'Provide description and/or status to update');
    }
    if (description !== undefined && !validDescription(description)) {
      return badRequest(res, 'description must be a non-empty string');
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return badRequest(res, `status must be one of: ${STATUSES.join(', ')}`);
    }

    const changes = {};
    if (description !== undefined) changes.description = description.trim();
    if (status !== undefined) changes.status = status;

    const task = await store.update(id, changes);
    if (!task) return res.status(404).json({ error: `Task ${id} not found` });
    res.json(task);
  })
);

// DELETE /tasks/:id
router.delete(
  '/:id',
  wrap(async (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (!(await store.remove(id))) {
      return res.status(404).json({ error: `Task ${id} not found` });
    }
    res.status(204).end();
  })
);

export default router;
