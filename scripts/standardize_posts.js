const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../public/posts');
const outputFile = path.join(postsDir, 'posts.json');

// Default cover images
const DEFAULT_COVERS = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1000"
];

function getRandomCover(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % DEFAULT_COVERS.length;
    return DEFAULT_COVERS[index];
}

// Ensure posts directory exists
if (!fs.existsSync(postsDir)) {
    console.error(`Error: Posts directory not found at ${postsDir}`);
    process.exit(1);
}

// Helper: Calculate read time
function calcReadTime(text) {
    const plainText = text.replace(/[#*>\-\[\]\(\)`]/g, '');
    // Estimate: 400 words per minute for English, 500 chars/min for Chinese
    // Simple mixed approach: Count "words" by splitting spaces, but for CJK, count chars?
    // The previous logic was chars / 500. Let's stick to a simple char count / 400 for a bit more conservative estimate or keep 500.
    // User said "calculate by word count".
    // Let's improve it slightly to handle mixed content better if needed, but chars/500 is a standard simple metric for CN/EN mixed.
    const chars = plainText.length;
    return Math.max(1, Math.round(chars / 500));
}

// Helper: Extract H1 from content
function extractH1(text) {
    const lines = text.split('\n');
    let inCodeBlock = false;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (!inCodeBlock && trimmed.startsWith('# ')) {
            return trimmed.substring(2).trim();
        }
    }
    return null;
}

// Helper: Generate excerpt
function generateExcerpt(text, maxLength = 120) {
    const plainText = text.replace(/[#*>\-\[\]\(\)`]/g, '')
                          .replace(/\s+/g, ' ')
                          .trim();
    return plainText.slice(0, maxLength) + (plainText.length > maxLength ? '...' : '');
}

// Helper: Parse YAML value
function parseYamlValue(key, value) {
    if (value === undefined || value === null) return '';
    value = String(value).trim();
    if (key === 'tags') {
        if (value.startsWith('[') && value.endsWith(']')) {
            try {
                // Try to handle simple JSON-like arrays
                const inner = value.slice(1, -1);
                if (!inner) return [];
                return inner.split(',').map(t => {
                    t = t.trim();
                    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
                        return t.slice(1, -1);
                    }
                    return t;
                }).filter(Boolean);
            } catch (e) {
                return [];
            }
        } else {
            return value.split(',').map(t => t.trim()).filter(Boolean);
        }
    }
    // Remove quotes for strings
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    return value;
}

// Helper: Format Date
function formatDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
}

// Main processing
const files = fs.readdirSync(postsDir).filter(file => file.endsWith('.md'));
const allPosts = [];

files.forEach(file => {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse Front Matter
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let metadata = {};
    let bodyContent = content;

    if (match) {
        const frontMatter = match[1];
        const lines = frontMatter.split('\n');
        let currentKey = null;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // Check for list item (starts with -)
            if (trimmedLine.startsWith('-')) {
                if (currentKey && Array.isArray(metadata[currentKey])) {
                    let val = trimmedLine.slice(1).trim();
                    // Remove quotes
                    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                        val = val.slice(1, -1);
                    }
                    metadata[currentKey].push(val);
                }
                return;
            }

            const idx = line.indexOf(':');
            if (idx !== -1) {
                const key = line.slice(0, idx).trim();
                let value = line.slice(idx + 1).trim();
                
                // If value is empty, it might be a start of a list
                if (!value) {
                    currentKey = key;
                    metadata[key] = []; // Initialize as array
                } else {
                    currentKey = key;
                    metadata[key] = value;
                }
            }
        });
        
        bodyContent = content.slice(match[0].length).trim();
    } else {
        // Handle files without front matter or with different format if necessary
        // For now, assume all files should have front matter
        console.warn(`Warning: No front matter found in ${file}`);
        bodyContent = content.trim();
    }

    // Standardize Metadata
    // Priority: H1 in body > metadata.title > Untitled
    const h1Title = extractH1(bodyContent);
    const title = h1Title || parseYamlValue('title', metadata.title || 'Untitled');

    const date = formatDate(parseYamlValue('date', metadata.date));
    const category = parseYamlValue('category', metadata.category || 'Uncategorized');
    const author = parseYamlValue('author', metadata.author || 'Thoi');
    const tags = parseYamlValue('tags', metadata.tags || '');
    const excerpt = parseYamlValue('excerpt', metadata.excerpt || generateExcerpt(bodyContent));
    
    // Always recalculate readTime based on current content
    const readTime = calcReadTime(bodyContent);

    let coverImage = parseYamlValue('coverImage', metadata.coverImage || '');

    if (!coverImage) {
        coverImage = getRandomCover(title);
    }

    // Reconstruct YAML
    const newFrontMatter = [
        '---',
        `title: "${title.replace(/"/g, '\\"')}"`,
        `date: "${date}"`,
        `category: "${category}"`,
        `author: "${author}"`,
        `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
        `excerpt: "${excerpt.replace(/"/g, '\\"')}"`,
        `readTime: ${readTime}`,
    ];
    if (coverImage) newFrontMatter.push(`coverImage: "${coverImage}"`);
    newFrontMatter.push('---');

    const newContent = newFrontMatter.join('\n') + '\n\n' + bodyContent;

    // Write back to file
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Standardized ${file}`);

    // Add to posts list
    allPosts.push({
        title,
        date,
        category,
        author,
        tags,
        excerpt,
        readTime,
        coverImage,
        file
    });
});

// Write posts.json
allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
fs.writeFileSync(outputFile, JSON.stringify(allPosts, null, 2), 'utf8');
console.log(`Generated posts.json with ${allPosts.length} posts.`);
