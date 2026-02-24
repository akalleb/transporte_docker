const net = require('net');
const server = net.createServer();
server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Port 3001 is in use');
  } else {
    console.log('Error:', err);
  }
});
server.once('listening', () => {
  server.close();
  console.log('Port 3001 is free');
});
server.listen(3001);