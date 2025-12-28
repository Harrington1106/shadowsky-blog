const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://blog.shadowsky.cn'; // Replace with your actual domain
const ROOT_DIR = path.join(__dirname, '../');
const POSTS_DIR = path.join(ROOT_DIR, 'public/posts');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap.xml');

// 1. Static Pages (Manual List)
const staticPages = [
    '',
    'index.html',
    'blog.html',
    'moments.html',
    'bookmarks.html',
    'rss.html',
    'acg.html',
    'about.html'
];

// 2. Blog Posts
function getBlogPosts() {
    if (!fs.existsSync(POSTS_DIR)) return [];
    
    const files = fs.readdirSync(POSTS_DIR);
    const posts = [];

    files.forEach(file => {
        if (!file.endsWith('.md') || file === 'README.md') return;

        const filePath = path.join(POSTS_DIR, file);
        const stats = fs.statSync(filePath);
        const lastMod = stats.mtime.toISOString().split('T')[0];

        // URL format: post.html?id=filename (without extension)
        const id = file.replace('.md', '');
        posts.push({
            url: `post.html?id=${id}`,
            lastMod: lastMod,
            priority: 0.8
        });
    });

    return posts;
}

// 3. Generate XML
function generateSitemap() {
    const posts = getBlogPosts();
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static Pages
    staticPages.forEach(page => {
        const url = page ? `${DOMAIN}/${page}` : DOMAIN;
        xml += `
    <url>
        <loc>${url}</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>${page === '' || page === 'index.html' ? '1.0' : '0.8'}</priority>
    </url>`;
    });

    // Posts
    posts.forEach(post => {
        xml += `
    <url>
        <loc>${DOMAIN}/${post.url}</loc>
        <lastmod>${post.lastMod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>${post.priority}</priority>
    </url>`;
    });

    xml += `
</urlset>`;

    fs.writeFileSync(OUTPUT_FILE, xml);
    console.log(`Sitemap generated at ${OUTPUT_FILE} with ${staticPages.length + posts.length} URLs.`);
}

generateSitemap();
