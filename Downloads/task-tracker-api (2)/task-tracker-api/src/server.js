import app from './app.js';
import * as store from './store.js';

const port = process.env.PORT || 3000;

store
  .init()
  .then(() => {
    app.listen(port, () =>
      console.log(`Task Tracker API listening on http://localhost:${port}`)
    );
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
