import { app } from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.listen(PORT, () => {
  console.log(`album-catalog service running on http://localhost:${PORT}`);
});
