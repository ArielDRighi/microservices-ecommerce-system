// Health check script for Docker container
import * as http from 'http';

const options = {
  hostname: 'localhost',
  port: parseInt(process.env['PORT'] || '3000', 10),
  path: '/health/live',
  method: 'GET',
  timeout: 3000,
};

const req = http.request(options, (res) => {
  // eslint-disable-next-line no-console
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('timeout', () => {
  // eslint-disable-next-line no-console
  console.log('Health check timeout');
  req.destroy();
  process.exit(1);
});

req.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error('Health check error:', error.message);
  process.exit(1);
});

req.end();
