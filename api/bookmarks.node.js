
const fs = require('fs');

// 允许跨域
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Content-Type", "application/json; charset=UTF-8");

if (req.method === 'OPTIONS') {
    res.end();
    return;
}

// KVDB Adapter for Node.js Cloud Function
class KVDB {
    constructor(name) {
        this.name = name;
        this.useFile = false;
        
        // Try to load Retiehe Database class
        if (typeof Database !== 'undefined') {
            this.db = new Database(name);
        } else {
            // Fallback to JSON file
            this.useFile = true;
            this.filePath = `data/${name}.json`;
            // Ensure data dir exists
            if (!fs.existsSync('data')) {
                try { fs.mkdirSync('data'); } catch (e) {}
            }
        }
    }

    async get(key) {
        if (this.useFile) {
            if (!fs.existsSync(this.filePath)) return null;
            try {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
                return data[key] || null;
            } catch (e) { return null; }
        }
        return await this.db.get(key);
    }

    async set(key, value) {
        if (this.useFile) {
            let data = {};
            if (fs.existsSync(this.filePath)) {
                try {
                    data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
                } catch (e) {}
            }
            data[key] = value;
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            return true;
        }
        return this.db.set(key, value); // Sync in Retiehe API
    }
}

async function main() {
    const db = new KVDB('shadowsky_data');
    const KEY_BOOKMARKS = 'bookmarks';

    if (req.method === 'GET') {
        const data = await db.get(KEY_BOOKMARKS);
        res.json(data ? JSON.parse(data) : []);
        return;
    }

    if (req.method === 'POST') {
        const input = req.body;
        
        if (!input.url) {
            res.status(400);
            res.json({ error: 'URL is required' });
            return;
        }

        let title = input.title || '';
        const url = input.url;

        // Auto-fetch title logic would go here
        // For Node.js CF, we might not have 'request' or 'axios' easily available unless pre-installed.
        // Assuming simple input for now or client-side title fetching.
        if (!title) {
             title = url;
        }

        // Get existing
        const raw = await db.get(KEY_BOOKMARKS);
        let bookmarks = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(bookmarks)) bookmarks = [];

        const newBookmark = {
            title: title,
            url: url,
            category: input.category || 'others',
            secondaryCategory: 'others',
            addedAt: new Date().toISOString()
        };

        bookmarks.unshift(newBookmark);

        const json = JSON.stringify(bookmarks);
        await db.set(KEY_BOOKMARKS, json);
        
        res.json({ success: true, bookmark: newBookmark });
    }
}

main();
