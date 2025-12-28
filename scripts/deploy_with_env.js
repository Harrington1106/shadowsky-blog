const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Update Service Worker cache version before deployment
 * This ensures users get fresh resources after each deploy
 */
function updateSwVersion() {
    const swPath = path.join(__dirname, '../sw.js');
    if (!fs.existsSync(swPath)) {
        console.warn('sw.js not found, skipping version update');
        return;
    }
    
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Generate new version based on timestamp
    const newVersion = `v${Date.now()}`;
    
    // Replace the CACHE_VERSION line
    const versionRegex = /const CACHE_VERSION = ['"]v[^'"]+['"]/;
    if (versionRegex.test(swContent)) {
        swContent = swContent.replace(versionRegex, `const CACHE_VERSION = '${newVersion}'`);
        fs.writeFileSync(swPath, swContent);
        console.log(`[Deploy] Updated SW cache version to: ${newVersion}`);
    } else {
        console.warn('[Deploy] Could not find CACHE_VERSION in sw.js');
    }
}

// Update SW version before deploy
updateSwVersion();

// Load .env if exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.slice(1, -1);
            }
            process.env[key] = value.trim();
        }
    });
    console.log('Loaded environment variables from .env');
} else {
    console.warn('No .env file found at ' + envPath);
}

// Fix for fetch failed errors (SSL/Proxy issues)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Ensure RTH_API_KEY is present
if (!process.env.RTH_API_KEY) {
    console.error('Error: RTH_API_KEY is not set. Please set it in .env file or environment variables.');
    // Don't exit yet, let the CLI try and fail if it wants, or maybe just exit.
    // The CLI fails with a fetch error if key is missing, so better to fail early with clear message.
    process.exit(1);
}

// Run the original CLI script
// Arguments are passed from the npm script
const args = process.argv.slice(2); 
let scriptArgs = args;

if (args.length === 0) {
    const siteName = process.env.SITE_NAME || 'shadowquake.top';
    console.log(process.env.SITE_NAME ? `Using site name from environment: ${siteName}` : `Using default site name: ${siteName}`);
    
    // Prepare build first
    console.log('Running build preparation...');
    try {
        const { execSync } = require('child_process');
        execSync('node scripts/prepare_deploy.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (e) {
        console.error('Build preparation failed.');
        process.exit(1);
    }

    scriptArgs = ['--site', siteName, '--outdir', 'dist_rth'];
}

console.log('Running deploy with args:', scriptArgs);

const child = spawn('node', [path.join(__dirname, 'retinbox-cli.js'), ...scriptArgs], {
    stdio: 'inherit',
    env: process.env,
    shell: true 
});

child.on('close', (code) => {
    process.exit(code);
});
