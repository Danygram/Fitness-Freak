// Local dev + long-running hosts (Render): start a listening server.
import app from './app.js';
import { initDb } from './db.js';

const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Fitness Freak API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
