import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const server = await createServer({
  root: __dirname,
  server: {
    port: Number(process.env.PORT) || 5180,
    strictPort: true,
  },
});

await server.listen();
server.printUrls();
