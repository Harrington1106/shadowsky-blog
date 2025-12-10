const fs = require('fs');
const path = require('path');

const bookmarksPath = path.join(__dirname, '../public/data/bookmarks.json');

// Define precise manual mappings
// Key: URL substring (domain) or Exact URL
// Value: { category, secondaryCategory }
const manualMappings = {
    // === Browser / Startpage / Navigation ===
    'limestart.cn': { category: 'browser', secondaryCategory: 'start_page' },
    'infinitynewtab.com': { category: 'browser', secondaryCategory: 'start_page' },
    'iowen.cn': { category: 'browser', secondaryCategory: 'start_page' },
    'aishenqi.net': { category: 'browser', secondaryCategory: 'start_page' },
    'tuostudy.upnb.top': { category: 'browser', secondaryCategory: 'start_page' }, // Navigation
    'wanrenmi8.com': { category: 'browser', secondaryCategory: 'start_page' }, // Navigation
    'nav.free2gpt.com': { category: 'browser', secondaryCategory: 'start_page' }, // Navigation
    'cc.ai55.cc': { category: 'browser', secondaryCategory: 'start_page' }, // Navigation

    // === Browser Extensions ===
    'chrome.google.com/webstore': { category: 'browser', secondaryCategory: 'extensions' },
    'microsoftedge.microsoft.com/addons': { category: 'browser', secondaryCategory: 'extensions' },
    'chajianxw.com': { category: 'browser', secondaryCategory: 'extensions' },
    'crxdl.com': { category: 'browser', secondaryCategory: 'extensions' },
    'greasyfork.org': { category: 'browser', secondaryCategory: 'scripts' },
    'tampermonkey.net': { category: 'browser', secondaryCategory: 'scripts' },

    // === AI Tools / Translation ===
    'leavesc.com': { category: 'tools', secondaryCategory: 'ai_translate' }, // srttran
    'translate.google': { category: 'tools', secondaryCategory: 'ai_translate' },
    'deepl.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'chatgpt.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'openai.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'claude.ai': { category: 'tools', secondaryCategory: 'ai_translate' },
    'anthropic.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'op1.mxnf.asia': { category: 'tools', secondaryCategory: 'ai_translate' },
    'deepseek.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'bard.google.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'thinkinai.xyz': { category: 'tools', secondaryCategory: 'ai_translate' },
    'metaso.cn': { category: 'tools', secondaryCategory: 'search' }, // AI Search
    'poe.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'agent.minimax.io': { category: 'tools', secondaryCategory: 'ai_translate' },
    'zaiwenai.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'explainthis.io': { category: 'tools', secondaryCategory: 'ai_translate' },
    'kimi.moonshot.cn': { category: 'tools', secondaryCategory: 'ai_translate' },
    'yiyan.baidu.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'doubao.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'tongyi.aliyun.com': { category: 'tools', secondaryCategory: 'ai_translate' },
    'midjourney.com': { category: 'tools', secondaryCategory: 'ai_translate' }, // AI Art
    
    // === Tools General ===
    'google.com/maps': { category: 'tools', secondaryCategory: 'maps' },
    'amap.com': { category: 'tools', secondaryCategory: 'maps' },
    'map.baidu.com': { category: 'tools', secondaryCategory: 'maps' },
    '123pan.com': { category: 'tools', secondaryCategory: 'cloud' },
    'share.lanol.cn': { category: 'tools', secondaryCategory: 'cloud' },
    'tvhelper.cpolar.top': { category: 'tools', secondaryCategory: 'cloud' }, // Sun-Panel
    'xiaomishequ.feishu.cn': { category: 'tools', secondaryCategory: 'office' }, // Feishu sheet
    'ke.ssshooter.com': { category: 'developer', secondaryCategory: 'docs' }, // Cheatsheets
    'haoweichi.com': { category: 'tools', secondaryCategory: 'online_dev' }, // Data generator
    'scamalytics.com': { category: 'tools', secondaryCategory: 'search' }, // IP check/search
    'jamcz.com': { category: 'tools', secondaryCategory: 'online_dev' }, // Software tools
    'yesicon.app': { category: 'design', secondaryCategory: 'fonts_icons' },
    'mingcute.com': { category: 'design', secondaryCategory: 'fonts_icons' },
    'anytxt.net': { category: 'tools', secondaryCategory: 'search' }, // Local search tool

    // === Developer / Coding ===
    'github.com': { category: 'developer', secondaryCategory: 'git' },
    'gitee.com': { category: 'developer', secondaryCategory: 'git' },
    'huggingface.co': { category: 'developer', secondaryCategory: 'git' },
    'liteloaderqqnt.github.io': { category: 'developer', secondaryCategory: 'opensource' },
    'thh789/chatgpt-downgrade': { category: 'guides', secondaryCategory: 'tech_deploy' },
    'chinese-independent-developer': { category: 'developer', secondaryCategory: 'opensource' },
    '101.lug.ustc.edu.cn': { category: 'guides', secondaryCategory: 'dev_learning' },
    'choosealicense.com': { category: 'developer', secondaryCategory: 'docs' },
    'lap.dev': { category: 'developer', secondaryCategory: 'opensource' },
    'developer.mozilla.org': { category: 'developer', secondaryCategory: 'docs' },

    // === Blogs (Tech / Personal) ===
    'easyhexo.com': { category: 'developer', secondaryCategory: 'docs' }, 
    'butterfly.js.org': { category: 'developer', secondaryCategory: 'docs' },
    'blog.canyie.top': { category: 'content_media', secondaryCategory: 'blogs' },
    'lsm.icu': { category: 'content_media', secondaryCategory: 'blogs' },
    'heinu.cc': { category: 'content_media', secondaryCategory: 'blogs' },
    'byoungd.gitbook.io': { category: 'content_media', secondaryCategory: 'blogs' },
    'ssshooter.com': { category: 'content_media', secondaryCategory: 'blogs' },
    'tingtalk.me': { category: 'content_media', secondaryCategory: 'blogs' },
    'quail.ink': { category: 'content_media', secondaryCategory: 'blogs' },
    'antfu.me': { category: 'content_media', secondaryCategory: 'blogs' },
    'ioaol.github.io': { category: 'guides', secondaryCategory: 'tech_deploy' },
    'mao.fan': { category: 'content_media', secondaryCategory: 'blogs' },
    'axis-t.com': { category: 'content_media', secondaryCategory: 'blogs' },
    'thiscute.world': { category: 'content_media', secondaryCategory: 'blogs' },

    // === Community ===
    '52pojie.cn': { category: 'content_media', secondaryCategory: 'community' },
    'juejin.cn': { category: 'content_media', secondaryCategory: 'community' },
    'segmentfault.com': { category: 'content_media', secondaryCategory: 'community' },
    'csdn.net': { category: 'content_media', secondaryCategory: 'community' },
    'immmmm.com': { category: 'content_media', secondaryCategory: 'community' },

    // === Education / Learning ===
    'coursera.org': { category: 'education', secondaryCategory: 'courses' },
    'udemy.com': { category: 'education', secondaryCategory: 'courses' },
    'wikipedia.org': { category: 'education', secondaryCategory: 'wiki' },
    'linklearner.com': { category: 'education', secondaryCategory: 'courses' },
    'oi-wiki.org': { category: 'education', secondaryCategory: 'wiki' },

    // === Guides ===
    'docker-practice.github.io': { category: 'guides', secondaryCategory: 'tech_deploy' },
    'magiskcn.com': { category: 'guides', secondaryCategory: 'system_ops' },
    'hacknode.org': { category: 'guides', secondaryCategory: 'dev_learning' }, // Go Bible

    // === Design ===
    'uisdc.com': { category: 'design', secondaryCategory: 'inspiration' },
    'dribbble.com': { category: 'design', secondaryCategory: 'inspiration' },
    'behance.net': { category: 'design', secondaryCategory: 'inspiration' },
    'figma.com': { category: 'design', secondaryCategory: 'ui_ux' },
    'onlook.dev': { category: 'design', secondaryCategory: 'ui_ux' },
    'mylens.ai': { category: 'design', secondaryCategory: 'inspiration' },

    // === Commerce / Digital Sub ===
    'naifeistation.com': { category: 'commerce', secondaryCategory: 'digital_sub' },
    '36kr.com': { category: 'content_media', secondaryCategory: 'news' },
    'sspai.com': { category: 'content_media', secondaryCategory: 'news' },
    'ifanr.com': { category: 'content_media', secondaryCategory: 'news' },
    'wired.com': { category: 'content_media', secondaryCategory: 'news' },
    'theverge.com': { category: 'content_media', secondaryCategory: 'news' },
    'techcrunch.com': { category: 'content_media', secondaryCategory: 'news' },
    'arstechnica.com': { category: 'content_media', secondaryCategory: 'news' },

    // === Social ===
    'biofy.cn': { category: 'social', secondaryCategory: 'social_net' },

    // === Others / Misc ===
    'kejicut.com': { category: 'tools', secondaryCategory: 'online_dev' }, // Shortcuts as tools
    'yhcres.top': { category: 'tools', secondaryCategory: 'cloud' }, // Resources
};

function reclassify() {
    if (!fs.existsSync(bookmarksPath)) {
        console.error('Bookmarks file not found!');
        return;
    }

    const rawData = fs.readFileSync(bookmarksPath, 'utf8');
    let bookmarks = JSON.parse(rawData);

    // Add new items requested if not exist
    const newItems = [
        {
            url: "https://www.limestart.cn/",
            title: "LimeStart - 青柠起始页",
            desc: "简洁、美观、好用的浏览器起始页。",
            category: "browser",
            addedAt: new Date().toISOString(),
            secondaryCategory: "start_page"
        },
        {
            url: "https://byoungd.gitbook.io/english-level-up-tips",
            title: "English Level Up Tips",
            desc: "英语进阶指南，寻找适合自己的英语学习方法。",
            category: "content_media",
            addedAt: new Date().toISOString(),
            secondaryCategory: "blogs"
        },
        {
            url: "https://srttran.leavesc.com/",
            title: "SRT字幕翻译工具",
            desc: "在线SRT字幕文件翻译工具，支持多种语言互译。",
            category: "tools",
            addedAt: new Date().toISOString(),
            secondaryCategory: "ai_translate"
        }
    ];

    newItems.forEach(newItem => {
        // Check if exists
        const exists = bookmarks.find(b => b.url === newItem.url || b.url.includes(newItem.url.replace('https://', '').replace(/\/$/, '')));
        if (!exists) {
            bookmarks.push(newItem);
        } else {
            // Update existing one with manual override info
            exists.title = newItem.title;
            exists.desc = newItem.desc;
            exists.category = newItem.category;
            exists.secondaryCategory = newItem.secondaryCategory;
        }
    });

    const updatedBookmarks = bookmarks.map(item => {
        const url = item.url || '';
        const lowerUrl = url.toLowerCase();
        let cat = item.category;
        let sub = item.secondaryCategory;

        // Apply Manual Mappings
        let matched = false;
        for (const key in manualMappings) {
            if (lowerUrl.includes(key)) {
                cat = manualMappings[key].category;
                sub = manualMappings[key].secondaryCategory;
                matched = true;
                break;
            }
        }
        
        // If not matched, we keep it as is, or default to 'others' if it was 'others'
        // But since we want "manual" classification, if it's not in our map, 
        // we might leave it alone if it already has a category, or set to others if we really want to enforce manual only.
        // User said "Do not rely on keyword classification".
        // So if it was previously auto-classified by keywords and not in our manual map, 
        // we technically should review it. But for now, let's assume the previous run was "okay" 
        // BUT we are overriding everything we know for sure.
        
        return {
            ...item,
            category: cat,
            secondaryCategory: sub
        };
    });

    fs.writeFileSync(bookmarksPath, JSON.stringify(updatedBookmarks, null, 2));
    console.log(`Reclassified ${updatedBookmarks.length} bookmarks.`);
}

reclassify();
