// Run with: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import app from '../src/app.js';
import * as store from '../src/store.js';

// Use a throwaway JSON file so tests never touch real data.
// (store.js reads TASKS_FILE lazily, so setting it after the imports is fine.)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
process.env.TASKS_FILE = path.join(tmpDir, 'tasks.json');


let server;
let base;

const call = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

before(async () => {
  await store.init(); // creates the file when missing
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('full task lifecycle', async () => {
  // add
  let r = await call('POST', '/tasks', { description: 'Buy groceries' });
  assert.equal(r.status, 201);
  assert.equal(r.body.id, 1);
  assert.equal(r.body.status, 'todo');
  assert.ok(r.body.createdAt && r.body.updatedAt);

  await call('POST', '/tasks', { description: 'Cook dinner' });
  await call('POST', '/tasks', { description: 'Wash dishes' });

  // update description
  r = await call('PATCH', '/tasks/1', { description: 'Buy groceries and snacks' });
  assert.equal(r.status, 200);
  assert.equal(r.body.description, 'Buy groceries and snacks');
  assert.equal(r.body.status, 'todo');

  // mark in progress / done
  r = await call('PATCH', '/tasks/2', { status: 'in-progress' });
  assert.equal(r.body.status, 'in-progress');
  r = await call('PATCH', '/tasks/3', { status: 'done' });
  assert.equal(r.body.status, 'done');
  assert.notEqual(r.body.updatedAt, r.body.createdAt);

  // list + filters
  const ids = async (q) => (await call('GET', '/tasks' + q)).body.map((t) => t.id);
  assert.deepEqual(await ids(''), [1, 2, 3]);
  assert.deepEqual(await ids('?status=todo'), [1]);
  assert.deepEqual(await ids('?status=in-progress'), [2]);
  assert.deepEqual(await ids('?status=done'), [3]);
  assert.deepEqual(await ids('?status=not-done'), [1, 2]);

  // get one
  r = await call('GET', '/tasks/2');
  assert.equal(r.body.description, 'Cook dinner');

  // delete
  r = await call('DELETE', '/tasks/2');
  assert.equal(r.status, 204);
  assert.equal((await call('GET', '/tasks/2')).status, 404);

  // ids are not reused
  r = await call('POST', '/tasks', { description: 'New one' });
  assert.equal(r.body.id, 4);
});

test('validation and error handling', async () => {
  assert.equal((await call('POST', '/tasks', {})).status, 400);
  assert.equal((await call('POST', '/tasks', { description: '   ' })).status, 400);
  assert.equal((await call('POST', '/tasks', { description: 42 })).status, 400);
  assert.equal((await call('POST', '/tasks', '{bad json')).status, 400);
  assert.equal((await call('GET', '/tasks?status=bogus')).status, 400);
  assert.equal((await call('GET', '/tasks/abc')).status, 400);
  assert.equal((await call('GET', '/tasks/99999')).status, 404);
  assert.equal((await call('PATCH', '/tasks/1', {})).status, 400);
  assert.equal((await call('PATCH', '/tasks/1', { status: 'finished' })).status, 400);
  assert.equal((await call('PATCH', '/tasks/99999', { status: 'done' })).status, 404);
  assert.equal((await call('DELETE', '/tasks/99999')).status, 404);
  assert.equal((await call('GET', '/nope')).status, 404);
});

test('tasks are persisted to the JSON file', async () => {
  const saved = JSON.parse(fs.readFileSync(process.env.TASKS_FILE, 'utf8'));
  assert.ok(Array.isArray(saved) && saved.length > 0);
  for (const key of ['id', 'description', 'status', 'createdAt', 'updatedAt']) {
    assert.ok(key in saved[0], `missing ${key}`);
  }
});

test('concurrent requests do not lose data', async () => {
  const before = (await call('GET', '/tasks')).body.length;
  await Promise.all(
    Array.from({ length: 20 }, (_, i) => call('POST', '/tasks', { description: `parallel ${i}` }))
  );
  const tasks = (await call('GET', '/tasks')).body;
  assert.equal(tasks.length, before + 20);
  assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length); // unique ids
});
