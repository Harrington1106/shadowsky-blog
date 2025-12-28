const http = require('http');
const { spawn } = require('child_process');

const PHP_PORT = 8000;
const TEST_TOKEN = 'test-secret-token-123';

function startPhpServer() {
    return new Promise((resolve, reject) => {
        console.log('Starting PHP server...');
        const php = spawn('php', ['-S', `localhost:${PHP_PORT}`, '-t', '.'], {
            cwd: 'd:\\shadowsky',
            env: { ...process.env, ADMIN_TOKEN: TEST_TOKEN }
        });

        // Resolve when we get some output or after a delay
        setTimeout(() => resolve(php), 1000);
        
        php.on('error', (err) => {
            console.error('Failed to start PHP server. Ensure PHP is in your PATH.');
            reject(err);
        });
    });
}

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: PHP_PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });

        req.on('error', (e) => resolve({ status: 500, error: e.message }));
        if (body) req.write(body);
        req.end();
    });
}

async function runTests() {
    let phpProcess;
    try {
        phpProcess = await startPhpServer();
    } catch (e) {
        console.log("⚠️ Skipping dynamic tests: PHP not found.");
        return;
    }

    console.log('\n=== Notice API Audit ===\n');

    // 1. Test GET (Public)
    const resGet = await makeRequest('GET', '/api/notice.php');
    if (resGet.status === 200) {
        console.log('✅ GET /api/notice.php: Public access allowed');
    } else {
        console.log(`❌ GET /api/notice.php failed: ${resGet.status}`);
    }

    // 2. Test POST (No Token)
    const resPostNoToken = await makeRequest('POST', '/api/notice.php', JSON.stringify({ content: 'Hack', show: true }));
    if (resPostNoToken.status === 401 || resPostNoToken.status === 500) {
        console.log('✅ POST /api/notice.php (No Token): Rejected');
    } else {
        console.log(`❌ POST /api/notice.php (No Token): Accepted! (${resPostNoToken.status})`);
    }

    // 3. Test POST (Valid Token)
    const payload = JSON.stringify({ content: 'System Maintenance', show: true, style: 'warning' });
    const resPost = await makeRequest('POST', '/api/notice.php', payload, { 'x-admin-token': TEST_TOKEN });
    if (resPost.status === 200) {
        console.log('✅ POST /api/notice.php (Token): Success');
    } else {
        console.log(`❌ POST /api/notice.php (Token): Failed (${resPost.status}) - ${resPost.data}`);
    }

    if (phpProcess) phpProcess.kill();
}

runTests();
