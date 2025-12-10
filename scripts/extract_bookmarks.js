const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../bookmarks.html');
const jsonPath = path.join(__dirname, '../public/data/bookmarks.json');

const content = fs.readFileSync(htmlPath, 'utf8');

// Categories to look for
const categories = [
  'astronomy', 'nature', 'news', 'ai', 'dev', 
  'design', 'learning', 'tools', 'others', 'entertainment'
];

const bookmarks = [];

categories.forEach(cat => {
  // Regex to find the section
  // <div id="cat" ...> ... </div>
  // This is tricky with regex because of nested divs.
  // Instead, let's look for the start of the section and the next section or end of file.
  
  const startRegex = new RegExp(`<div id="${cat}"[^>]*>`, 'i');
  const startMatch = content.match(startRegex);
  
  if (!startMatch) {
    console.log(`Category ${cat} not found`);
    return;
  }
  
  const startIndex = startMatch.index;
  
  // Find the next category start or end of container
  // We can try to split the content by category IDs, but their order might vary.
  // A simpler approach for this specific file:
  // Find all <a href="..."> inside the section.
  
  // Let's assume the file structure is somewhat clean.
  // We'll extract a chunk of text that likely belongs to this category.
  // We can look for the next <div id="..."> that matches one of the other categories.
  
  let endIndex = content.length;
  categories.forEach(otherCat => {
    if (otherCat === cat) return;
    const otherStartMatch = content.match(new RegExp(`<div id="${otherCat}"[^>]*>`, 'i'));
    if (otherStartMatch && otherStartMatch.index > startIndex && otherStartMatch.index < endIndex) {
      endIndex = otherStartMatch.index;
    }
  });
  
  const sectionContent = content.substring(startIndex, endIndex);
  
  // Now extract links from this section
  // <a href="URL" ...> ... <h3 ...>TITLE</h3> ... <p ...>DESC</p> ... </a>
  
  const linkRegex = /<a href="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/a>/gi;
  
  let match;
  while ((match = linkRegex.exec(sectionContent)) !== null) {
    const url = match[1];
    let title = match[2].trim();
    let desc = match[3].trim();
    
    // Clean up HTML tags if any
    title = title.replace(/<[^>]+>/g, '').trim();
    desc = desc.replace(/<[^>]+>/g, '').trim();
    
    // Check if it's a "import from bookmarks" placeholder
    if (desc === '从收藏夹导入') {
      desc = '';
    }
    
    bookmarks.push({
      url,
      title,
      desc,
      category: cat,
      addedAt: new Date().toISOString()
    });
  }
});

// Ensure directory exists
const dir = path.dirname(jsonPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(jsonPath, JSON.stringify(bookmarks, null, 2));
console.log(`Extracted ${bookmarks.length} bookmarks to ${jsonPath}`);
