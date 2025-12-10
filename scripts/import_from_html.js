const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../bookmark (2).html');
const jsonPath = path.join(__dirname, '../public/data/bookmarks.json');
const categoriesPath = path.join(__dirname, '../public/data/categories.json');

// Mapping from HTML folder name to internal category ID
const categoryMapping = {
    '我的收藏': 'my_favorites',
    'AI与工具类': 'ai_tools',
    '学习与教育': 'education',
    '资源下载与搜索': 'resources',
    '生活实用工具': 'life_tools',
    '娱乐与兴趣': 'entertainment',
    '文学与阅读': 'literature_reading',
    '开发与技术': 'dev_tech',
    '博客与教程': 'blogs_tutorials',
    '系统与破解资源': 'system_resources',
    '视频剪辑': 'video_editing',
    '其他/无法归类': 'others'
};

// Internal category ID to Display Name (for categories.json)
const categoryDisplayNames = {
    'my_favorites': '我的收藏',
    'ai_tools': 'AI与工具类',
    'education': '学习与教育',
    'resources': '资源下载与搜索',
    'life_tools': '生活实用工具',
    'entertainment': '娱乐与兴趣',
    'literature_reading': '文学与阅读',
    'dev_tech': '开发与技术',
    'blogs_tutorials': '博客与教程',
    'system_resources': '系统与破解资源',
    'video_editing': '视频剪辑',
    'others': '其他/无法归类'
};

function parseBookmarks(html) {
    const bookmarks = [];
    const lines = html.split('\n');
    let currentCategory = 'others';
    
    // Simple state machine parser
    // We look for <H3> to set current category
    // We look for <A> to add bookmark
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for Category Header
        // <DT><H3 ADD_DATE="..." ...>Category Name</H3>
        const h3Match = line.match(/<H3[^>]*>(.*?)<\/H3>/i);
        if (h3Match) {
            const folderName = h3Match[1].trim();
            if (categoryMapping[folderName]) {
                currentCategory = categoryMapping[folderName];
                console.log(`Found category: ${folderName} -> ${currentCategory}`);
            } else {
                console.log(`Unknown category folder: ${folderName}, defaulting to others`);
                currentCategory = 'others';
            }
            continue;
        }
        
        // Check for Bookmark Link
        // <DT><A HREF="..." ...>Title</A>
        const aMatch = line.match(/<A HREF="(.*?)"[^>]*>(.*?)<\/A>/i);
        if (aMatch) {
            const url = aMatch[1].trim();
            const title = aMatch[2].trim();
            
            // Skip "placeholders" or empty links if any
            if (!url) continue;

            bookmarks.push({
                title: title || url,
                url: url,
                category: currentCategory,
                secondaryCategory: 'others' // Default to 'others' subcat for now as HTML is flat
            });
        }
    }
    
    return bookmarks;
}

try {
    if (!fs.existsSync(htmlPath)) {
        console.error(`File not found: ${htmlPath}`);
        process.exit(1);
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const bookmarks = parseBookmarks(htmlContent);
    
    console.log(`Parsed ${bookmarks.length} bookmarks.`);
    
    // Write bookmarks.json
    fs.writeFileSync(jsonPath, JSON.stringify(bookmarks, null, 2));
    console.log(`Updated ${jsonPath}`);

    // Update categories.json
    const categories = {
        "my_favorites": {
            "name": "我的收藏",
            "group": "收藏"
        },
        "ai_tools": {
            "name": "AI与工具类",
            "group": "工具"
        },
        "education": {
            "name": "学习与教育",
            "group": "学习"
        },
        "resources": {
            "name": "资源下载与搜索",
            "group": "资源"
        },
        "life_tools": {
            "name": "生活实用工具",
            "group": "生活"
        },
        "entertainment": {
            "name": "娱乐与兴趣",
            "group": "娱乐"
        },
        "literature_reading": {
            "name": "文学与阅读",
            "group": "阅读"
        },
        "dev_tech": {
            "name": "开发与技术",
            "group": "技术"
        },
        "blogs_tutorials": {
            "name": "博客与教程",
            "group": "学习"
        },
        "system_resources": {
            "name": "系统与破解资源",
            "group": "资源"
        },
        "video_editing": {
            "name": "视频剪辑",
            "group": "媒体"
        },
        "others": {
            "name": "其他/无法归类",
            "group": "其他"
        }
    };
    
    fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
    console.log(`Updated ${categoriesPath}`);

} catch (err) {
    console.error('Error processing bookmarks:', err);
}
