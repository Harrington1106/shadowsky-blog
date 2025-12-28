import re
import os

SOURCE_FILE = r"d:\shadowsky\bookmark.html"
TARGET_FILE = r"d:\shadowsky\bookmarks.html"

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

CATEGORY_NAMES = {
    "entertainment": "娱乐兴趣",
    "others": "其他收藏"
}

CATEGORY_ICONS = {
    "entertainment": "gamepad-2",
    "others": "folder-heart"
}

CATEGORY_COLORS = {
    "entertainment": "purple",
    "others": "slate"
}

def parse_bookmarks(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex for NETSCAPE-Bookmark-file-1
    pattern = re.compile(r'<DT><H3[^>]*>(.*?)</H3>\s*<DL><p>(.*?)</DL><p>', re.DOTALL)
    matches = pattern.findall(content)
    
    bookmarks = {}
    
    for folder_name, folder_content in matches:
        link_pattern = re.compile(r'<DT><A HREF="(.*?)"[^>]*>(.*?)</A>')
        links = link_pattern.findall(folder_content)
        
        target_cat = MAPPING.get(folder_name, "others")
        if target_cat not in bookmarks:
            bookmarks[target_cat] = []
        
        for url, title in links:
            bookmarks[target_cat].append({
                "url": url,
                "title": title,
                "desc": "从收藏夹导入"
            })
            
    return bookmarks

def generate_html_card(item):
    url = item['url']
    title = item['title']
    desc = item['desc']
    
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

def generate_section_html(category_id, items):
    name = CATEGORY_NAMES.get(category_id, category_id.capitalize())
    icon = CATEGORY_ICONS.get(category_id, "folder")
    color = CATEGORY_COLORS.get(category_id, "blue")
    
    cards_html = "\n".join([generate_html_card(item) for item in items])
    
    section_html = f'''
            <!-- {name} Section -->
            <div id="{category_id}" class="mb-16 scroll-mt-32">
                <div class="flex items-center mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div class="p-2 bg-{color}-100 dark:bg-{color}-900/30 rounded-lg mr-4">
                        <i data-lucide="{icon}" class="w-6 h-6 text-{color}-600 dark:text-{color}-400"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{name}</h2>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 card-grid">
{cards_html}
                </div>
            </div>'''
    return section_html

def generate_nav_link(category_id):
    name = CATEGORY_NAMES.get(category_id, category_id.capitalize())
    color = CATEGORY_COLORS.get(category_id, "gray")
    
    return f'''
                    <a href="#{category_id}" class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-{color}-500 hover:text-{color}-600 dark:hover:text-{color}-400 transition-all shadow-sm">
                        {name}
                    </a>'''

def main():
    print("Parsing bookmarks...")
    bookmarks = parse_bookmarks(SOURCE_FILE)
    
    print("Reading target file...")
    with open(TARGET_FILE, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    new_sections = []
    
    # Process existing categories
    for category_id, items in bookmarks.items():
        if not items:
            continue
            
        # Check for duplication
        if items[0]['url'] in html_content:
            print(f"Skipping {category_id}, content seems to be already present.")
            continue

        # Check if category exists in HTML
        section_pattern = f'id="{category_id}"'
        if section_pattern in html_content:
            print(f"Merging into existing category: {category_id}")
            
            # Locate the section
            start_idx = html_content.find(f'id="{category_id}"')
            if start_idx == -1:
                print(f"Error finding section {category_id}")
                continue
                
            # Find the grid div after the section start
            # We look for 'class="grid'
            grid_marker = 'class="grid'
            grid_start_idx = html_content.find(grid_marker, start_idx)
            
            if grid_start_idx == -1:
                print(f"Error finding grid for {category_id}")
                continue
            
            # Find the end of the opening tag ">"
            grid_open_end = html_content.find('>', grid_start_idx)
            if grid_open_end == -1:
                print(f"Error finding grid opening tag end for {category_id}")
                continue
                
            insertion_point = grid_open_end + 1
            
            cards_html = "\n".join([generate_html_card(item) for item in items])
            html_content = html_content[:insertion_point] + "\n" + cards_html + html_content[insertion_point:]
            
        else:
            print(f"New category found: {category_id}")
            if category_id not in new_sections:
                new_sections.append(category_id)
    
    # Handle new sections
    if new_sections:
        print(f"Adding new sections: {new_sections}")
        
        # 1. Add to Navbar
        # Look for the last nav link or the closing div of nav container
        # The nav container has class "flex overflow-x-auto ... no-scrollbar"
        # We can find the div that contains these links.
        # Let's search for "no-scrollbar" and find the closing div?
        
        # Or simpler: find the link for "tools" and append after it?
        tools_link_marker = 'href="#tools"'
        tools_link_idx = html_content.find(tools_link_marker)
        
        if tools_link_idx != -1:
            # Find the closing </a> tag for tools link
            link_close_idx = html_content.find('</a>', tools_link_idx) + 4
            
            nav_html = "\n".join([generate_nav_link(cat) for cat in new_sections])
            html_content = html_content[:link_close_idx] + nav_html + html_content[link_close_idx:]
        else:
            print("Warning: Could not find tools link in navbar")

        # 2. Add Sections body
        # Insert before <div id="no-results"
        no_results_marker = '<div id="no-results"'
        no_results_idx = html_content.find(no_results_marker)
        
        if no_results_idx != -1:
            sections_html = "\n".join([generate_section_html(cat, bookmarks[cat]) for cat in new_sections])
            html_content = html_content[:no_results_idx] + sections_html + "\n\n" + html_content[no_results_idx:]
        else:
             print("Warning: Could not find no-results div")

    print("Writing updated content...")
    with open(TARGET_FILE, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print("Done!")

if __name__ == "__main__":
    main()
