import express from 'express';
import tasksRouter from './routes/tasks.js';

const app = express();

app.use(express.json());
app.use('/tasks', tasksRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler (invalid JSON bodies, unexpected DB errors, ...)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
