const fs = require('fs');
const path = require('path');

try {
    const cliPath = path.join(__dirname, 'scripts/retinbox-cli.js');
    if (!fs.existsSync(cliPath)) {
        console.error('File not found:', cliPath);
        process.exit(1);
    }
    const content = fs.readFileSync(cliPath, 'utf8');

    // Search for "retiehe.com"
    const searchString = "retiehe.com";
    let index = content.indexOf(searchString);

    if (index === -1) {
        console.log("String 'retiehe.com' not found.");
    }

    while (index !== -1) {
        const start = Math.max(0, index - 100);
        const end = Math.min(content.length, index + 100);
        console.log(`Found 'retiehe.com' at ${index}: ...${content.substring(start, end)}...`);
        
        // Find next
        index = content.indexOf(searchString, index + 1);
    }

    // Search for "api-overseas"
    const searchString2 = "api-overseas";
    let index2 = content.indexOf(searchString2);
    
    if (index2 === -1) {
        console.log("String 'api-overseas' not found.");
    }

    while (index2 !== -1) {
        const start = Math.max(0, index2 - 100);
        const end = Math.min(content.length, index2 + 100);
        console.log(`Found 'api-overseas' at ${index2}: ...${content.substring(start, end)}...`);
        index2 = content.indexOf(searchString2, index2 + 1);
    }

} catch (e) {
    console.error(e);
}
