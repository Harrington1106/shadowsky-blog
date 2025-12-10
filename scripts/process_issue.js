const fs = require('fs');
const path = require('path');

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
        console.log(`Category ${id} already exists, updating...`);
    }

    categories[id] = { name, group };

    fs.writeFileSync(filePath, JSON.stringify(categories, null, 2));
    console.log('Categories updated');
}

async function handleBookmark(data) {
    const title = data['Title'];
    const url = data['URL'];
    const desc = data['Description'] || '';
    const category = data['Category ID'];

    if (!title || !url || !category) {
        console.error('Missing required bookmark fields');
        process.exit(1);
    }

    const filePath = path.join(__dirname, '../public/data/bookmarks.json');
    let bookmarks = [];
    if (fs.existsSync(filePath)) {
        try {
            bookmarks = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.error('Error reading bookmarks.json', e);
        }
    }

    const newBookmark = {
        title,
        url,
        desc,
        category,
        addedAt: new Date().toISOString()
    };

    bookmarks.unshift(newBookmark);

    fs.writeFileSync(filePath, JSON.stringify(bookmarks, null, 2));
    console.log('Bookmarks updated');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
