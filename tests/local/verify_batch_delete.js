const fs = require('fs');
const path = require('path');
const http = require('http');

async function testBatchDelete() {
    const API_BASE = 'http://127.0.0.1:3000/api';
    
    // Read ADMIN_TOKEN from .env
    const envPath = path.join(__dirname, '../../.env');
    let ADMIN_TOKEN = '';
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/ADMIN_TOKEN=(.*)/);
        if (match) {
            ADMIN_TOKEN = match[1].trim();
        }
    } catch (e) {
        console.error('[Error] Could not read .env file:', e);
        return;
    }

    if (!ADMIN_TOKEN) {
        console.error('[Error] ADMIN_TOKEN not found in .env');
        return;
    }

    console.log('--- Testing Batch Delete API ---');

    // 1. Create dummy bookmarks directly in the file
    const bookmarksPath = path.join(__dirname, '../../public/data/bookmarks.json');
    let bookmarks = [];
    if (fs.existsSync(bookmarksPath)) {
        bookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
    }

    const dummyIds = ['test-uuid-1', 'test-uuid-2'];
    const dummyBookmarks = [
        { id: dummyIds[0], title: 'Test 1', url: 'http://test1.com', category: 'Test' },
        { id: dummyIds[1], title: 'Test 2', url: 'http://test2.com', category: 'Test' }
    ];

    // Remove existing dummy bookmarks if any (cleanup from previous failed runs)
    bookmarks = bookmarks.filter(b => !dummyIds.includes(b.id));
    
    // Add dummy bookmarks
    bookmarks.push(...dummyBookmarks);
    fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
    console.log(`[Setup] Added ${dummyBookmarks.length} dummy bookmarks.`);

    // 2. Call batch delete API using http module to avoid external fetch dependency if needed, 
    // but fetch is available in Node 18+. Assuming Node environment supports fetch or using http.
    // I'll stick to fetch as it was used before, but fix the headers.
    
    try {
        const response = await fetch(`${API_BASE}/bookmarks/batch-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': ADMIN_TOKEN
            },
            body: JSON.stringify({ ids: dummyIds })
        });

        const data = await response.json();
        console.log('[API Response]', response.status, data);

        if (response.ok && data.success && data.deleted === 2) {
            console.log('[PASS] Batch delete successful.');
        } else {
            console.error('[FAIL] Batch delete failed or count mismatch.');
        }

    } catch (error) {
        console.error('[FAIL] API call error:', error);
    }

    // 3. Verify file content
    const updatedBookmarks = JSON.parse(fs.readFileSync(bookmarksPath, 'utf8'));
    const found = updatedBookmarks.filter(b => dummyIds.includes(b.id));
    if (found.length === 0) {
        console.log('[PASS] Dummy bookmarks removed from file.');
    } else {
        console.error('[FAIL] Dummy bookmarks still exist in file:', found);
    }
}

testBatchDelete();
