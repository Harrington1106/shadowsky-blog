const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(__dirname, '../dist_rth');

// Whitelist of files/folders to copy to Static Host
// Based on User's "Deployment Distribution Table"
const INCLUDES = [
    // Directories
    'api', // Critical: Backend API files
    'css',
    'js',
    'public',
    // Files
    'index.html',
    'about.html',
    'anime.html',
    'blog.html',
    'bookmarks.html',
    'manga.html',
    'moments.html',
    'post.html',
    'rss.html',
    'acg.html',
    '404.html',
    'sw.js',
    'sitemap.xml',
    'robots.txt',
    'favicon.ico' 
];

// Exclude specific heavy files or patterns from public/posts/ that are not needed for production
const EXCLUDES = [
    '.DS_Store',
    'Thumbs.db',
    '*.bak',
    '*.tmp',
    '*.log'
];

// Extensions to allow in root if not explicitly listed (optional safety net)
const ALLOWED_EXTS = ['.html', '.txt', '.xml', '.ico', '.png', '.jpg'];

function shouldExclude(filename) {
    return EXCLUDES.some(pattern => {
        if (pattern.startsWith('*')) {
            return filename.endsWith(pattern.slice(1));
        }
        return filename === pattern;
    });
}

function cleanDist() {
    try {
        if (fs.existsSync(DIST_DIR)) {
            fs.rmSync(DIST_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(DIST_DIR);
    } catch (error) {
        console.error('❌ Failed to clean/create dist folder:', error);
        process.exit(1);
    }
}

function copyRecursive(src, dest) {
    try {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest);
            }
            const files = fs.readdirSync(src);
            for (const file of files) {
                // Skip hidden files/dirs (like .git, .env) inside folders
                if (file.startsWith('.')) continue;
                if (shouldExclude(file)) continue;
                copyRecursive(path.join(src, file), path.join(dest, file));
            }
        } else {
            if (!shouldExclude(path.basename(src))) {
                fs.copyFileSync(src, dest);
            }
        }
    } catch (error) {
        console.error(`❌ Failed to copy ${src} to ${dest}:`, error);
        process.exit(1);
    }
}

function run() {
    console.log('🚧 Preparing build for Hot Iron Box (Static Host)...');
    console.log(`📂 Source: ${SOURCE_DIR}`);
    console.log(`📦 Dest:   ${DIST_DIR}`);

    cleanDist();

    const rootFiles = fs.readdirSync(SOURCE_DIR);
    let copiedCount = 0;

    for (const item of rootFiles) {
        // Skip hidden files/dirs in root immediately
        if (item.startsWith('.')) continue;

        const srcPath = path.join(SOURCE_DIR, item);
        const destPath = path.join(DIST_DIR, item);

        // Check if explicitly included
        if (INCLUDES.includes(item)) {
            console.log(`✅ Copying: ${item}`);
            copyRecursive(srcPath, destPath);
            copiedCount++;
            continue;
        }

        // Check extensions for root files not in explicit list but safe
        if (fs.statSync(srcPath).isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (ALLOWED_EXTS.includes(ext)) {
                 // Double check it's not a blacklisted name even if extension matches
                 // (e.g. don't copy config.php even if we allowed .php - but we didn't allow .php)
                 console.log(`✅ Copying (Safe Ext): ${item}`);
                 fs.copyFileSync(srcPath, destPath);
                 copiedCount++;
            } else {
                // Silent skip for clarity
                // console.log(`🚫 Skipping (Unknown Ext): ${item}`);
            }
        } else {
            // It's a directory not in INCLUDES (e.g. api, admin, data, scripts, sql)
            // console.log(`🛑 Skipping (Excluded Dir): ${item}`);
        }
    }

    if (copiedCount === 0) {
        console.error('❌ No files were copied! Something is wrong.');
        process.exit(1);
    }

    console.log(`✨ Build preparation complete. Copied ${copiedCount} root items.`);
}

run();
