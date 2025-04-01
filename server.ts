import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { scheduleCronJobs } from './cron-jobs';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function setupServer() {
  await app.prepare();
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });
  // 初始化定时任务

  await scheduleCronJobs();
  server.listen(port, () => {
    console.log(`> Server is running on http://${hostname}:${port}`);
  });
}

setupServer().catch(console.error);
