const axios = require('axios');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const PHP_SERVER_PORT = 8888;
const BASE_URL = `http://127.0.0.1:${PHP_SERVER_PORT}/api/rss-proxy.php`;

async function startPhpServer() {
    return new Promise((resolve) => {
        const server = exec(`php -S 127.0.0.1:${PHP_SERVER_PORT} -t .`);
        setTimeout(() => resolve(server), 1000); // Give it a second to start
    });
}

async function testProxy(url, description) {
    try {
        const response = await axios.get(BASE_URL, {
            params: { url },
            validateStatus: () => true
        });
        return {
            description,
            url,
            status: response.status,
            data: response.data,
            passed: false // To be set by caller
        };
    } catch (e) {
        return {
            description,
            url,
            error: e.message,
            passed: false
        };
    }
}

async function runTests() {
    console.log('Starting PHP Server for testing...');
    const serverProcess = await startPhpServer();

    try {
        console.log('\n=== RSS Proxy Security Audit ===\n');

        const tests = [
            // 1. SSRF Tests - Localhost
            {
                url: 'http://localhost',
                desc: 'Block localhost',
                check: (r) => r.status === 403 && r.data.includes('localhost is denied')
            },
            {
                url: 'http://127.0.0.1',
                desc: 'Block 127.0.0.1',
                check: (r) => r.status === 403 && r.data.includes('private IP')
            },
            
            // 2. SSRF Tests - Private Ranges
            {
                url: 'http://192.168.1.1',
                desc: 'Block 192.168.x.x',
                check: (r) => r.status === 403 && r.data.includes('private IP')
            },
            {
                url: 'http://10.0.0.1',
                desc: 'Block 10.x.x.x',
                check: (r) => r.status === 403 && r.data.includes('private IP')
            },
            
            // 3. Protocol Tests
            {
                url: 'ftp://example.com/file',
                desc: 'Block non-HTTP protocols',
                check: (r) => r.status === 403 && r.data.includes('Only HTTP/HTTPS')
            },
            {
                url: 'file:///etc/passwd',
                desc: 'Block file protocol',
                check: (r) => r.status === 403 // curl_init might fail earlier or filter_var
            },

            // 4. Valid Request Test
            {
                url: 'https://github.com/status', // Usually reliable
                desc: 'Allow valid external HTTPS',
                check: (r) => r.status === 200 || r.status === 502 // 502 is acceptable if GitHub blocks curl, but 403 from proxy is failure
            }
        ];

        let passed = 0;
        for (const t of tests) {
            const result = await testProxy(t.url, t.desc);
            const isSuccess = t.check(result);
            
            if (isSuccess) {
                console.log(`✅ PASS: ${t.desc}`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${t.desc}`);
                console.log(`   Status: ${result.status}`);
                console.log(`   Response: ${result.data}`);
            }
        }

        console.log(`\nResult: ${passed}/${tests.length} passed.`);
        
        if (passed === tests.length) {
            console.log('\n🎉 AUDIT PASSED: SSRF Protection is active.');
        } else {
            console.error('\n💥 AUDIT FAILED: Security vulnerabilities detected.');
            process.exit(1);
        }

    } finally {
        serverProcess.kill();
    }
}

runTests();
