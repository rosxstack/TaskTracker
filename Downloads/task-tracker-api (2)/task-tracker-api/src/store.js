// JSON-file storage using Node's built-in fs module.
import fs from 'node:fs/promises';
import path from 'node:path';

const filePath = () =>
  process.env.TASKS_FILE || path.resolve(process.cwd(), 'tasks.json');

// All operations run one at a time so concurrent requests can't clobber each other.
let queue = Promise.resolve();
function serialize(fn) {
  const run = queue.then(fn);
  queue = run.catch(() => {});
  return run;
}

async function load() {
  let raw;
  try {
    raw = await fs.readFile(filePath(), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await save([]); // create the file if it does not exist
      return [];
    }
    throw err;
  }
  if (!raw.trim()) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`${filePath()} contains invalid JSON`);
  }
  if (!Array.isArray(data)) throw new Error(`${filePath()} must contain a JSON array`);
  return data;
}

// Write to a temp file then rename, so a crash can't leave a half-written file.
async function save(tasks) {
  const tmp = `${filePath()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(tasks, null, 2));
  await fs.rename(tmp, filePath());
}

const now = () => new Date().toISOString();

const init = () => serialize(load);

const list = (status) =>
  serialize(async () => {
    const tasks = await load();
    if (status === undefined) return tasks;
    if (status === 'not-done') return tasks.filter((t) => t.status !== 'done');
    return tasks.filter((t) => t.status === status);
  });

const get = (id) =>
  serialize(async () => (await load()).find((t) => t.id === id) || null);

const create = (description) =>
  serialize(async () => {
    const tasks = await load();
    const task = {
      id: tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1,
      description,
      status: 'todo',
      createdAt: now(),
      updatedAt: now(),
    };
    tasks.push(task);
    await save(tasks);
    return task;
  });

const update = (id, changes) =>
  serialize(async () => {
    const tasks = await load();
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    Object.assign(task, changes, { updatedAt: now() });
    await save(tasks);
    return task;
  });

const remove = (id) =>
  serialize(async () => {
    const tasks = await load();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    tasks.splice(index, 1);
    await save(tasks);
    return true;
  });

export { init, list, get, create, update, remove };
