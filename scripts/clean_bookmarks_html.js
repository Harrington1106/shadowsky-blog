const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../bookmarks.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// List of categories to clean
const categories = [
  'astronomy', 'nature', 'news', 'ai', 'dev', 
  'design', 'learning', 'tools', 'others', 'entertainment'
];

categories.forEach(cat => {
  // Regex to find the section and its card-grid
  // We look for <div id="cat" ...> ... <div class="... card-grid"> ... </div> ... </div>
  // But regex for nested divs is hard.
  // However, we know the structure is specific:
  // <div id="cat" ...>
  //   <div class="header...">...</div>
  //   <div class="... card-grid">
  //      CONTENT TO REMOVE
  //   </div>
  // </div>
  
  // Let's try to find the card-grid start for this category
  const sectionStartRegex = new RegExp(`<div id="${cat}"[^>]*>`, 'i');
  const sectionMatch = content.match(sectionStartRegex);
  
  if (!sectionMatch) {
    console.log(`Category ${cat} not found`);
    return;
  }
  
  const startIndex = sectionMatch.index;
  // Find the card-grid div inside this section
  const gridStartRegex = /<div class="[^"]*card-grid[^"]*">/i;
  // We search from startIndex
  const restOfContent = content.substring(startIndex);
  const gridMatch = restOfContent.match(gridStartRegex);
  
  if (!gridMatch) {
    console.log(`Card grid for ${cat} not found`);
    return;
  }
  
  const gridStartIndex = startIndex + gridMatch.index;
  const gridContentStart = gridStartIndex + gridMatch[0].length;
  
  // Now find the closing div for the grid. 
  // Since we know the structure, we can assume the grid closes before the next section or end of container.
  // Actually, counting divs is safer.
  
  let depth = 1;
  let currentPos = gridContentStart;
  while (depth > 0 && currentPos < content.length) {
    const nextOpen = content.indexOf('<div', currentPos);
    const nextClose = content.indexOf('</div>', currentPos);
    
    if (nextClose === -1) break; // Should not happen
    
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      currentPos = nextOpen + 4;
    } else {
      depth--;
      currentPos = nextClose + 6;
    }
  }
  
  const gridEndIndex = currentPos - 6; // Position before the last </div>
  
  // Replace content
  const before = content.substring(0, gridContentStart);
  const after = content.substring(gridEndIndex);
  
  // We want to preserve the empty grid div
  content = before + '\n                    <!-- Bookmarks will be loaded dynamically -->\n                ' + after;
  console.log(`Cleaned category: ${cat}`);
});

fs.writeFileSync(htmlPath, content);
console.log('Done cleaning bookmarks.html');
