const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../bookmarks.html');
let content = fs.readFileSync(htmlPath, 'utf8');

const categories = [
  'astronomy', 'nature', 'news', 'ai', 'dev', 
  'design', 'learning', 'tools', 'others', 'entertainment'
];

categories.forEach(cat => {
  // Find the start of the category section
  const sectionStartRegex = new RegExp(`<div id="${cat}"[^>]*>`, 'i');
  const sectionMatch = content.match(sectionStartRegex);
  
  if (!sectionMatch) {
    console.log(`Category section #${cat} not found`);
    return;
  }
  
  const sectionStartIndex = sectionMatch.index;
  
  // Find the grid container inside this section
  // It usually starts with <div class="grid ...">
  // We search after the section start
  const gridRegex = /<div class="grid[^>]*>/i;
  // We need to find the one strictly after the section start and before the next section
  
  // Let's find the end of this section roughly (start of next section or end of file)
  let nextSectionIndex = content.length;
  categories.forEach(otherCat => {
    if (otherCat === cat) return;
    const otherMatch = content.match(new RegExp(`<div id="${otherCat}"[^>]*>`, 'i'));
    if (otherMatch && otherMatch.index > sectionStartIndex && otherMatch.index < nextSectionIndex) {
      nextSectionIndex = otherMatch.index;
    }
  });
  
  const sectionContent = content.substring(sectionStartIndex, nextSectionIndex);
  const gridMatch = sectionContent.match(gridRegex);
  
  if (gridMatch) {
    // We found the grid div start tag.
    // We want to replace this entire div (start tag + content + end tag) 
    // OR just replace the content.
    // Replacing the whole div with a standard empty one is safer and ensures 'card-grid' class.
    
    const absoluteGridStart = sectionStartIndex + gridMatch.index;
    
    // Find the matching closing div for this grid div
    // We need to count nested divs
    let depth = 0;
    let gridEndIndex = -1;
    let foundStart = false;
    
    // Scan from absoluteGridStart
    for (let i = absoluteGridStart; i < content.length; i++) {
      if (content.substring(i, i + 4) === '<div') {
        depth++;
        foundStart = true;
      } else if (content.substring(i, i + 5) === '</div') {
        depth--;
        if (foundStart && depth === 0) {
          // Found the closing tag of the grid div
          // i is the start of </div>. We want to include </div> so i + 6
          gridEndIndex = i + 6;
          break;
        }
      }
    }
    
    if (gridEndIndex !== -1) {
      console.log(`Cleaning category: ${cat}`);
      const before = content.substring(0, absoluteGridStart);
      const after = content.substring(gridEndIndex);
      const newGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 card-grid"></div>`;
      
      content = before + newGrid + after;
    } else {
      console.log(`Could not find closing div for grid in ${cat}`);
    }
  } else {
    console.log(`Grid container not found in ${cat}`);
  }
});

fs.writeFileSync(htmlPath, content);
console.log('Bookmarks HTML cleaned.');
