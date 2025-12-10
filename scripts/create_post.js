// create_post.js - Create new blog post with standard YAML
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PROJECT_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(PROJECT_ROOT, 'public', 'posts');

// Ensure posts directory exists
if (!fs.existsSync(POSTS_DIR)) {
    console.error(`Error: Posts directory not found at ${POSTS_DIR}`);
    process.exit(1);
}

function slugify(text) {
    return text.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .trim();
}

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createNewPost() {
    console.log("--- New Blog Post Wizard ---");
    
    const title = await question('Title (Chinese): ');
    const manualSlug = await question('Slug (English, e.g., my-new-post): ');

    if (!title || !manualSlug) {
        console.log("Title and Slug are required.");
        rl.close();
        return;
    }

    const datePart = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const slug = slugify(manualSlug);
    const filename = `${datePart}-${slug}.md`;
    const fullPath = path.join(POSTS_DIR, filename);

    if (fs.existsSync(fullPath)) {
        console.log(`File already exists: ${filename}`);
        rl.close();
        return;
    }

    // Standard YAML Template
    const content = `---
title: "${title}"
date: "${datePart}"
category: "Uncategorized"
author: "Thoi"
tags: []
excerpt: ""
readTime: 5
coverImage: ""
---

# ${title}

Write your content here...
`;

    fs.writeFileSync(fullPath, content);
    console.log(`\nSuccess! Created ${fullPath}`);
    console.log(`Don't forget to run 'node scripts/standardize_posts.js' after writing.`);
    
    // Try to open the file
    try {
        const { exec } = require('child_process');
        // Windows
        exec(`start "" "${fullPath}"`);
    } catch (e) {
        console.log("Could not open file automatically.");
    }

    rl.close();
}

createNewPost();
