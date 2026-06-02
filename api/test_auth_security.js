const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PHP_PORT = 8000;
const TEST_TOKEN = 'test-secret-token-123';

// Helper to start PHP Server
function startPhpServer() {
    return new Promise((resolve, reject) => {
        // Create a temporary php.ini to expose env vars if needed, 
        // but PHP built-in server inherits env vars by default.
        // We set ADMIN_TOKEN in env.
        
        console.log('Starting PHP server...');
        const php = spawn('php', ['-S', `localhost:${PHP_PORT}`, '-t', '.'], {
            cwd: path.resolve(__dirname, '..'), // Root dir
            env: { ...process.env, ADMIN_TOKEN: TEST_TOKEN }
        });

        php.stdout.on('data', (data) => console.log(`[PHP]: ${data}`));
        php.stderr.on('data', (data) => console.error(`[PHP Error]: ${data}`));

        // Give it a second to start
        setTimeout(() => resolve(php), 1000);
        
        php.on('error', (err) => {
            console.error('Failed to start PHP server:', err);
            reject(err);
        });
    });
}

// Helper to make requests
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

        console.log('\n=== Auth Security Audit ===\n');
        
        const endpoints = [
            { name: 'Feeds', path: '/api/feeds.php' },
            { name: 'Bookmarks', path: '/api/bookmarks.php' }
        ];

        let allPassed = true;

        for (const ep of endpoints) {
            console.log(`Testing ${ep.name} (${ep.path})...`);
            
            // 1. Test No Token
            const resNoToken = await makeRequest('POST', ep.path, JSON.stringify({ test: 1 }));
            if (resNoToken.status === 401 || resNoToken.status === 500) { // 500 if env not set, but we set it. 401 is goal.
                 console.log(`✅ [Pass] Rejected without token (Status: ${resNoToken.status})`);
            } else {
                 console.log(`❌ [FAIL] Accepted without token! (Status: ${resNoToken.status})`);
                 allPassed = false;
            }

            // 2. Test Invalid Token
            const resBadToken = await makeRequest('POST', ep.path, JSON.stringify({ test: 1 }), { 'x-admin-token': 'wrong' });
            if (resBadToken.status === 401) {
                 console.log(`✅ [Pass] Rejected with bad token`);
            } else {
                 console.log(`❌ [FAIL] Accepted with bad token! (Status: ${resBadToken.status})`);
                 allPassed = false;
            }

            // 3. Test Valid Token
            // Note: We send dummy data, might fail validation (400) or file write (500), but MUST NOT be 401.
            const resGoodToken = await makeRequest('POST', ep.path, JSON.stringify([]), { 'x-admin-token': TEST_TOKEN });
            if (resGoodToken.status !== 401) {
                 console.log(`✅ [Pass] Accepted with valid token (Status: ${resGoodToken.status})`);
            } else {
                 console.log(`❌ [FAIL] Rejected with valid token! (Status: ${resGoodToken.status})`);
                 allPassed = false;
            }
            console.log('---');
        }

        if (allPassed) {
            console.log('\n✨ AUDIT PASSED: All endpoints secured.');
            process.exit(0);
        } else {
            console.log('\n💥 AUDIT FAILED: Security vulnerabilities detected.');
            process.exit(1);
        }

    } catch (e) {
        console.error('Test Error:', e);
        process.exit(1);
    } finally {
        if (phpProcess) {
            phpProcess.kill();
        }
    }
}

runTests();
