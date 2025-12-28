import re
import os

# Source file path
SOURCE_FILE = r"d:\shadowsky\bookmark.html"

# Mapping from source category (or "root") to target section ID
# Target IDs: astronomy, nature, news, ai, dev, design, learning, tools
# New IDs to create: entertainment, others
MAPPING = {
    "我的收藏": "others",
    "AI与工具类": "ai",
    "学习与教育": "learning",
    "资源下载与搜索": "tools",
    "生活实用工具": "tools",
    "娱乐与兴趣": "entertainment",
    "文学与阅读": "entertainment",
    "开发与技术": "dev",
    "博客与教程": "dev",
    "系统与破解资源": "tools",
    "视频剪辑": "design",
    "其他/无法归类": "others"
}

def parse_bookmarks(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract folders and their contents
    # This is a simple regex parser for NETSCAPE-Bookmark-file-1
    # It assumes the structure <DT><H3 ...>Folder Name</H3><DL><p>...items...</DL><p>
    
    bookmarks = {}
    
    # Split by folders
    # We look for <DT><H3 ...>TITLE</H3> ... <DL><p> ... </DL><p>
    # Note: Nested folders might be tricky, but based on the file content, it looks flat-ish (top level folders).
    # The "我的收藏" folder seems to contain the first batch of links, but then other folders follow at the same level?
    # Let's look at the file content structure again.
    # Line 9: <DT><H3 ...>我的收藏</H3>
    # Line 10: <DL><p>
    # ... links ...
    # Line 21: </DL><p>
    # Line 22: <DT><H3 ...>AI与工具类</H3>
    # ...
    
    pattern = re.compile(r'<DT><H3[^>]*>(.*?)</H3>\s*<DL><p>(.*?)</DL><p>', re.DOTALL)
    matches = pattern.findall(content)
    
    for folder_name, folder_content in matches:
        # Parse links in this folder
        link_pattern = re.compile(r'<DT><A HREF="(.*?)"[^>]*>(.*?)</A>')
        links = link_pattern.findall(folder_content)
        
        target_cat = MAPPING.get(folder_name, "others")
        if target_cat not in bookmarks:
            bookmarks[target_cat] = []
        
        for url, title in links:
            bookmarks[target_cat].append({
                "url": url,
                "title": title,
                "desc": "" # No description in source usually, or we can try to find DD?
            })
            
    # Also check for root links if any (before the first H3)
    # But in the file provided, it starts with <H1>...<DL><p><DT><H3>...
    # So "我的收藏" IS the first folder.
    
    return bookmarks

def generate_html_card(item):
    url = item['url']
    title = item['title']
    desc = "从收藏夹导入" # Default description
    
    # Try to guess icon based on category or URL? 
    # For now, use a generic icon like 'link' or 'bookmark'
    
    html = f'''
                    <a href="{url}" target="_blank" rel="noopener" class="group relative bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-800 hover:-translate-y-1">
                        <div class="flex items-start justify-between mb-4">
                            <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 text-slate-600 dark:text-slate-400">
                                <i data-lucide="bookmark" class="w-6 h-6"></i>
                            </div>
                            <i data-lucide="external-link" class="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"></i>
                        </div>
                        <h3 class="text-lg font-bold mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors break-words">{title}</h3>
                        <p class="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">
                            {desc}
                        </p>
                    </a>'''
    return html

def main():
    bookmarks = parse_bookmarks(SOURCE_FILE)
    
    # Output generated HTML for each category
    for category, items in bookmarks.items():
        print(f"=== CATEGORY: {category} ===")
        print(f'<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 card-grid" id="imported-{category}">')
        for item in items:
            print(generate_html_card(item))
        print('</div>')
        print("=== END CATEGORY ===")

if __name__ == "__main__":
    main()
