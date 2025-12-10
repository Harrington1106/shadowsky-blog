const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to parse Issue Form Body
function parseIssueBody(body) {
    const lines = body.split('\n');
    const data = {};
    let currentKey = null;
    let currentValue = [];

    for (const line of lines) {
        // Issue forms use ### Header
        const match = line.match(/^###\s+(.+)$/);
        if (match) {
            if (currentKey) {
                data[currentKey] = currentValue.join('\n').trim();
            }
            currentKey = match[1].trim();
            currentValue = [];
        } else if (currentKey) {
            // Skip the placeholder text if present or empty lines
            if (line.trim() !== '_No response_') {
                currentValue.push(line);
            }
        }
    }
    if (currentKey) {
        data[currentKey] = currentValue.join('\n').trim();
    }
    return data;
}

// Helper to fetch GitHub Repo Metadata
function fetchGitHubMetadata(url) {
    return new Promise((resolve) => {
        // 1. Check if it is a GitHub URL
        // Match: github.com/owner/repo (ignoring sub-paths like /issues)
        const match = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            return resolve({});
        }

        const owner = match[1];
        const repo = match[2].replace(/\.git$/, ''); // Remove .git if present
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

        const options = {
            headers: {
                'User-Agent': 'ShadowSky-Bookmark-Bot', // Custom UA
                'Accept': 'application/vnd.github.v3+json'
            }
        };
        
        // Use token if available to avoid rate limits
        if (process.env.GITHUB_TOKEN) {
            options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        console.log(`Fetching GitHub metadata for ${owner}/${repo}...`);

        https.get(apiUrl, options, (res) => {
            if (res.statusCode !== 200) {
                console.warn(`GitHub API returned ${res.statusCode} for ${url}`);
                res.resume();
                return resolve({});
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({
                        stars: json.stargazers_count,
                        language: json.language,
                        forks: json.forks_count,
                        repoDesc: json.description
                    });
                } catch (e) {
                    console.error('Failed to parse GitHub API response', e);
                    resolve({});
                }
            });
        }).on('error', (e) => {
            console.error('GitHub API request failed', e);
            resolve({});
        });
    });
}

async function main() {
    const body = process.env.ISSUE_BODY;
    const labels = JSON.parse(process.env.ISSUE_LABELS || '[]');
    
    if (!body) {
        console.error('No issue body found');
        process.exit(1);
    }

    const data = parseIssueBody(body);
    console.log('Parsed Data:', data);

    const isCategory = labels.some(l => l.name === 'add-category');
    const isBookmark = labels.some(l => l.name === 'add-bookmark');

    if (isCategory) {
        await handleCategory(data);
    } else if (isBookmark) {
        await handleBookmark(data);
    } else {
        console.log('No relevant labels found');
    }
}

async function handleCategory(data) {
    const id = data['Category ID'];
    const name = data['Display Name'];
    const group = data['Group Name'] || 'Default';

    if (!id || !name) {
        console.error('Missing required category fields');
        process.exit(1);
    }

    // Path relative to where script is run (root of repo)
    const filePath = path.join(__dirname, '../public/data/categories.json');
    let categories = {};
    if (fs.existsSync(filePath)) {
        try {
            categories = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error('Error reading categories.json', e);
        }
    }

    if (categories[id]) {
<<<<<<< HEAD
        console.log(`Category ${id} already exists, updating...`);
=======
        console。log(`Category ${id} already exists, updating...`);
>>>>>>> c10a126f5580483102864d21a0967a78600dc271
    }

    categories[id] = { name, group };

<<<<<<< HEAD
    fs.writeFileSync(filePath, JSON.stringify(categories, null, 2));
    console.log('Categories updated');
=======
    fs。writeFileSync(filePath， JSON.stringify(categories， null， 2));
    console。log('Categories updated');
>>>>>>> c10a126f5580483102864d21a0967a78600dc271
}

async function handleBookmark(data) {
    const title = data['Title'];
    const url = data['URL'];
    const desc = data['Description'] || '';
    const category = data['Category ID'];

    if (!title || !url || !category) {
<<<<<<< HEAD
        console.error('Missing required bookmark fields');
        process.exit(1);
    }

    const filePath = path.join(__dirname, '../public/data/bookmarks.json');
=======
        console。error('Missing required bookmark fields');
        process。exit(1);
    }

    const filePath = path.join(__dirname， '../public/data/bookmarks.json');
>>>>>>> c10a126f5580483102864d21a0967a78600dc271
    let bookmarks = [];
    if (fs.existsSync(filePath)) {
        try {
            bookmarks = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
<<<<<<< HEAD
            console.error('Error reading bookmarks.json', e);
=======
            console.error('Error reading bookmarks.json'， e);
>>>>>>> c10a126f5580483102864d21a0967a78600dc271
        }
    }

    // Fetch Metadata
    const meta = await fetchGitHubMetadata(url);

    const newBookmark = {
        title,
        url,
        // Use user-provided desc, fallback to GitHub repo desc, fallback to empty
        desc: desc || meta.repoDesc || '', 
        category,
        stars: meta.stars,       // undefined if not GH repo
        language: meta.language, // undefined if not GH repo
        forks: meta.forks,       // undefined if not GH repo
        addedAt: new Date().toISOString()
    };

    bookmarks.unshift(newBookmark);

    fs.writeFileSync(filePath, JSON.stringify(bookmarks, null, 2));
    console.log('Bookmarks updated with metadata:', {
        title,
        stars: meta.stars,
        lang: meta.language
    });
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
