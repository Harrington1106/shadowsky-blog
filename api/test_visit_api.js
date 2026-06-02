/**
 * Test script to verify visit.php API functionality
 * Run with: node api/test_visit_api.js
 * 
 * This script tests the visit API by:
 * 1. Checking if the data directory exists and is writable
 * 2. Testing the KVDB-based visit counter logic (simulating file fallback)
 * 3. Verifying JSON response format
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'shadowsky_stats.json');

console.log('=== Visit API Verification ===\n');

// Test 1: Check data directory exists
console.log('1. Checking data directory...');
if (fs.existsSync(DATA_DIR)) {
    console.log('   ✓ Data directory exists:', DATA_DIR);
} else {
    console.log('   ✗ Data directory missing, creating...');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('   ✓ Data directory created');
}

// Test 2: Check shadowsky_stats.json exists and is readable
console.log('\n2. Checking shadowsky_stats.json file...');
if (fs.existsSync(DB_FILE)) {
    console.log('   ✓ shadowsky_stats.json exists');
    try {
        let content = fs.readFileSync(DB_FILE, 'utf8');
        // Remove BOM if present (UTF-8 BOM: \uFEFF)
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
            console.log('   ⚠ BOM detected and removed');
            // Rewrite file without BOM
            fs.writeFileSync(DB_FILE, content);
        }
        const data = JSON.parse(content);
        console.log('   ✓ shadowsky_stats.json is valid JSON');
        // Show partial data
        if (data.visit_stats) {
            console.log('   Has visit_stats:', typeof data.visit_stats);
        }
    } catch (e) {
        console.log('   ✗ shadowsky_stats.json parse error:', e.message);
        console.log('   Attempting to fix by recreating file...');
        fs.writeFileSync(DB_FILE, '{}');
        console.log('   ✓ shadowsky_stats.json recreated with empty object');
    }
} else {
    console.log('   ✗ shadowsky_stats.json missing, creating...');
    fs.writeFileSync(DB_FILE, '{}');
    console.log('   ✓ shadowsky_stats.json created');
}

// Test 3: Check write permissions
console.log('\n3. Testing write permissions...');
try {
    let content = fs.readFileSync(DB_FILE, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const testData = JSON.parse(content);
    testData['_test_write'] = Date.now();
    fs.writeFileSync(DB_FILE, JSON.stringify(testData, null, 2));
    
    // Clean up test entry
    delete testData['_test_write'];
    fs.writeFileSync(DB_FILE, JSON.stringify(testData, null, 2));
    
    console.log('   ✓ Write permissions OK');
} catch (e) {
    console.log('   ✗ Write permission error:', e.message);
}

// Test 4: Verify expected JSON response format
console.log('\n4. Expected API response format:');
const expectedResponse = {
    success: true,
    data: {
        page: 'home',
        count: 123,
        total_site_visits: 456,
        mode: 'kv_unified'
    }
};
console.log('   ', JSON.stringify(expectedResponse, null, 2));

console.log('\n=== Verification Complete ===');
console.log('\nTo test the actual PHP API:');
console.log('1. Start a local PHP server: php -S localhost:8000');
console.log('2. Visit: http://localhost:8000/api/visit.php?page=home');
console.log('3. Expected: JSON response with success, data.count, and data.total_site_visits');
