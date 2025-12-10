const fs = require('fs');
const path = require('path');
const https = require('https');

const OWNER = 'Harrington1106';
const REPO = 'blog-add';
const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchIssues(labels) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${OWNER}/${REPO}/issues?labels=${labels}&state=open&per_page=100`,
            headers: {
                'User-Agent': 'Node.js Script',
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`GitHub API Error: ${res.statusCode} ${res.statusMessage}`));
                }
            });
        }).on('error', reject);
    });
}

// Helper to process Bookmark Issues
function processBookmarks(issues) {
    return issues.map(issue => {
        const body = issue.body || '';
        const lines = body.split('\n').map(l => l.trim());
        
        // Extract fields using regex similar to bookmarks.js
        const getField = (regex) => {
            const line = lines.find(l => regex.test(l));
            return line ? line.split(':').slice(1).join(':').trim() : '';
        };

        const url = getField(/^url\s*:/i);
        if (!url) return null; // Skip if no URL

        const categoryRaw = getField(/^category\s*:/i) || 'others';
        const subCatRaw = getField(/^(sub|subcategory)\s*:/i);
        const titleFromBody = getField(/^title\s*:/i);
        const icon = getField(/^icon\s*:/i);
        const orderLine = getField(/^order\s*:/i);
        const order = orderLine ? Number(orderLine) : undefined;

        // Clean up body to get note/desc
        const note = body
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/<img[^>]*>/g, '')
            .replace(/^url\s*:.*$/gim, '')
            .replace(/^category\s*:.*$/gim, '')
            .replace(/^(sub|subcategory)\s*:.*$/gim, '')
            .replace(/^title\s*:.*$/gim, '')
            .replace(/^icon\s*:.*$/gim, '')
            .replace(/#[\w\u4e00-\u9fa5-]+/g, '')
            .trim();

        const title = (titleFromBody || issue.title || url).trim();

        return {
            title,
            url,
            category: categoryRaw,
            secondaryCategory: subCatRaw,
            note,
            icon,
            order,
            number: issue.number
        };
    }).filter(item => item !== null);
}

// Helper to process Moment Issues
function processMoments(issues) {
    return issues.map(issue => {
        // Parse body for image
        const imgMatch = issue.body.match(/!\[.*?\]\((.*?)\)/) || issue.body.match(/<img.*?src="(.*?)".*?>/);
        const image = imgMatch ? imgMatch[1] : null;
        
        // Remove image markdown from content
        let content = issue.body.replace(/!\[.*?\]\(.*?\)/g, '').replace(/<img.*?>/g, '').trim();
        
        // Parse tags
        const tags = [];
        const tagMatches = content.match(/#[\w\u4e00-\u9fa5]+/g);
        if (tagMatches) {
            tags.push(...tagMatches.map(t => t.substring(1)));
            content = content.replace(/#[\w\u4e00-\u9fa5]+/g, '').trim();
        }

        return {
            id: `gh-${issue.number}`,
            date: issue.created_at,
            content: content,
            image: image,
            location: issue.title, // Assuming title is location
            tags: tags,
            fromGithub: true
        };
    });
}

async function main() {
    console.log(`Syncing data from ${OWNER}/${REPO}...`);

    try {
        // 1. Fetch and Save Bookmarks
        console.log('Fetching Bookmarks...');
        const bookmarkIssues = await fetchIssues('bookmark');
        const bookmarks = processBookmarks(bookmarkIssues);
        fs.writeFileSync(path.join(OUTPUT_DIR, 'bookmarks.json'), JSON.stringify(bookmarks, null, 2));
        console.log(`Saved ${bookmarks.length} bookmarks to public/data/bookmarks.json`);

        // 2. Fetch and Save Moments
        console.log('Fetching Moments...');
        const momentIssues = await fetchIssues('moment');
        const moments = processMoments(momentIssues);
        fs.writeFileSync(path.join(OUTPUT_DIR, 'moments.json'), JSON.stringify(moments, null, 2));
        console.log(`Saved ${moments.length} moments to public/data/moments.json`);

        console.log('Sync complete!');
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

main();
