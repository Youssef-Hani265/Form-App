// Smoke test: verify server starts and responds
process.env.GMAIL_USER = 'youssefhani265@gmail.com';
process.env.GMAIL_APP_PASSWORD = 'nyaz cbnm ylwf xxgx';
process.env.PORT = '3001';

const server = require('./server.js');

// Give the server 1 second to start, then hit the health endpoint
setTimeout(async () => {
    try {
        const http = require('http');
        http.get('http://localhost:3001/', (res) => {
            console.log('✅ Server started — HTTP status:', res.statusCode);
            process.exit(0);
        }).on('error', (e) => {
            console.error('❌ Request failed:', e.message);
            process.exit(1);
        });
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
}, 1000);
