const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const dns = require('dns');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`${YELLOW}=== ShadowSky Network Diagnostic Tool ===${RESET}\n`);

const checks = [
    {
        name: 'GitHub Connectivity',
        url: 'https://api.github.com',
        method: 'HEAD',
        headers: { 'User-Agent': 'ShadowSky-Network-Check' }
    },
    {
        name: 'Hot Iron Box API (Frontend)',
        url: 'https://shadowquake.top/api/check.php',
        method: 'HEAD'
    }
];

const pingTarget = '47.118.28.27';

function checkUrl(check) {
    return new Promise((resolve) => {
        const lib = check.url.startsWith('https') ? https : http;
        const req = lib.request(check.url, { method: check.method, headers: check.headers, timeout: 5000 }, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                console.log(`[${GREEN}PASS${RESET}] ${check.name} (${check.url}) - Status: ${res.statusCode}`);
                resolve(true);
            } else {
                console.log(`[${RED}FAIL${RESET}] ${check.name} (${check.url}) - Status: ${res.statusCode}`);
                resolve(false);
            }
        });

        req.on('error', (e) => {
            console.log(`[${RED}FAIL${RESET}] ${check.name} (${check.url}) - Error: ${e.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.log(`[${RED}FAIL${RESET}] ${check.name} (${check.url}) - Timeout`);
            resolve(false);
        });

        req.end();
    });
}

function checkPing(ip) {
    return new Promise((resolve) => {
        // Windows uses -n, Linux/Mac uses -c
        const platform = process.platform;
        const arg = platform === 'win32' ? '-n' : '-c';
        
        exec(`ping ${arg} 2 ${ip}`, (error, stdout, stderr) => {
            if (error) {
                console.log(`[${RED}FAIL${RESET}] Private Server Ping (${ip})`);
                // console.log(stdout); // Optional: show ping output
                resolve(false);
            } else {
                console.log(`[${GREEN}PASS${RESET}] Private Server Ping (${ip})`);
                resolve(true);
            }
        });
    });
}

async function runChecks() {
    let allPass = true;

    for (const check of checks) {
        const pass = await checkUrl(check);
        if (!pass) allPass = false;
    }

    const pingPass = await checkPing(pingTarget);
    if (!pingPass) allPass = false;

    console.log('\n' + '-'.repeat(30));
    if (allPass) {
        console.log(`${GREEN}✅ All Network Checks Passed.${RESET}`);
        process.exit(0);
    } else {
        console.log(`${RED}❌ Some Network Checks Failed.${RESET}`);
        console.log(`Please refer to 'docs/DEVELOPMENT_MANUAL.md' -> '9. 网络排障手册' for solutions.`);
        process.exit(1);
    }
}

runChecks();
