const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const bookmarksPath = path.join(__dirname, '../public/data/bookmarks.json');

// Configuration
const BATCH_SIZE = 3; // Reduced from 5
const TIMEOUT = 30000; // Increased from 10000
const MAX_RETRIES = 3;

async function fetchMetadata(url, attempt = 1) {
    try {
        const response = await axios.get(url, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 300; // default
            },
        });

        const $ = cheerio.load(response.data);
        
        // Try multiple sources for description
        const description = 
            $('meta[name="description"]').attr('content') || 
            $('meta[property="og:description"]').attr('content') || 
            $('meta[name="twitter:description"]').attr('content') ||
            '';

        // Try multiple sources for title (optional update)
        const title = 
            $('meta[property="og:title"]').attr('content') || 
            $('title').text() || 
            '';

        return { 
            description: description.trim(),
            title: title.trim()
        };
    } catch (e) {
        if (attempt < MAX_RETRIES) {
            console.log(`  -> Retry ${attempt}/${MAX_RETRIES} for ${url} (${e.message})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff-ish
            return fetchMetadata(url, attempt + 1);
        }
        console.error(`Failed to fetch ${url}: ${e.message}`);
        return null;
    }
}

async function processBatch(bookmarks) {
    let updatedCount = 0;
    
    // Helper to process a single bookmark
    const processBookmark = async (bookmark, index) => {
        // Skip if already has description
        if (bookmark.description && bookmark.description.length > 0) {
            return false;
        }
        
        // Skip invalid URLs
        if (!bookmark.url || !bookmark.url.startsWith('http')) {
            return false;
        }

        console.log(`[${index + 1}/${bookmarks.length}] Fetching metadata for: ${bookmark.title || bookmark.url}`);
        
        const metadata = await fetchMetadata(bookmark.url);
        
        if (metadata && metadata.description) {
            bookmark.description = metadata.description;
            // Also update title if missing
            if (!bookmark.title && metadata.title) {
                bookmark.title = metadata.title;
            }
            console.log(`  -> Found description: ${metadata.description.substring(0, 50)}...`);
            return true;
        } else {
            console.log(`  -> No description found.`);
            return false;
        }
    };

    // Process in chunks
    for (let i = 0; i < bookmarks.length; i += BATCH_SIZE) {
        const chunk = bookmarks.slice(i, i + BATCH_SIZE);
        const promises = chunk.map((b, idx) => processBookmark(b, i + idx));
        const results = await Promise.all(promises);
        updatedCount += results.filter(r => r).length;
        
        // Save progress after each batch
        fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
    }

    return updatedCount;
}

async function main() {
    if (!fs.existsSync(bookmarksPath)) {
        console.error('Bookmarks file not found!');
        return;
    }

    try {
        const data = fs.readFileSync(bookmarksPath, 'utf8');
        const bookmarks = JSON.parse(data);
        
        // Handle array or object format
        const bookmarkList = Array.isArray(bookmarks) ? bookmarks : (bookmarks.bookmarks || []);
        
        if (bookmarkList.length === 0) {
            console.log('No bookmarks to process.');
            return;
        }

        console.log(`Found ${bookmarkList.length} bookmarks. Starting update...`);
        const updated = await processBatch(bookmarkList);
        
        console.log(`\nUpdate complete! Updated ${updated} bookmarks.`);
        
        // Final save (redundant if saving per batch, but good for safety)
        if (Array.isArray(bookmarks)) {
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarkList, null, 2));
        } else {
            bookmarks.bookmarks = bookmarkList;
            fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
        }
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
