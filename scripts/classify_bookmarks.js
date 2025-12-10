const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const bookmarksPath = path.join(__dirname, '../public/data/bookmarks.json');

// --- 1. New 7-Category Schema (Source of Truth: User Instruction) ---
const CATEGORIES = {
    TOOLS: {
        id: 'tools',
        subs: {
            ONLINE_TOOLS: 'online_tools',
            FILE_CONVERT: 'file_convert',
            IMAGE_PROCESS: 'image_process',
            VIDEO_PROCESS: 'video_process',
            AI_TOOLS: 'ai_tools',
            API_SERVICES: 'api_services',
            DEV_TOOLS: 'dev_tools',
            DATA_VIZ: 'data_viz',
            TEXT_PROCESS: 'text_process'
        }
    },
    CONTENT: {
        id: 'content',
        subs: {
            TECH_BLOG: 'tech_blog',
            TUTORIALS: 'tutorials',
            NEWS: 'news',
            WIKI: 'wiki',
            REVIEWS: 'reviews',
            RESOURCES: 'resources',
            THEMATIC: 'thematic'
        }
    },
    COMMUNITY: {
        id: 'community',
        subs: {
            FORUMS: 'forums',
            COMMENTS: 'comments',
            TOPICS: 'topics',
            QNA: 'qna',
            SOCIAL_PROFILES: 'social_profiles',
            OPENSOURCE_COMM: 'opensource_comm'
        }
    },
    PRODUCT: {
        id: 'product',
        subs: {
            SAAS: 'saas',
            PERSONAL_PRODUCT: 'personal_product',
            PROJECT_HOME: 'project_home',
            APP_DOWNLOAD: 'app_download',
            CORP_PRODUCT: 'corp_product'
        }
    },
    DIRECTORY: {
        id: 'directory',
        subs: {
            WEB_NAV: 'web_nav',
            TOOL_COLLECTION: 'tool_collection',
            RESOURCE_INDEX: 'resource_index',
            THEMATIC_DIR: 'thematic_dir'
        }
    },
    BUSINESS: {
        id: 'business',
        subs: {
            BIZ_INTRO: 'biz_intro',
            PRICING: 'pricing',
            CORP_HOME: 'corp_home',
            JOBS: 'jobs',
            MARKETING_LANDING: 'marketing_landing'
        }
    },
    PERSONAL: {
        id: 'personal',
        subs: {
            PERSONAL_HOME: 'personal_home',
            PERSONAL_BLOG: 'personal_blog',
            RESUME: 'resume',
            PORTFOLIO: 'portfolio'
        }
    }
};

// --- 2. Fetch & Analysis Logic ---

async function fetchPage(url) {
    if (!url || !url.startsWith('http')) return null;
    
    console.log(`Fetching ${url}...`);
    try {
        const response = await axios.get(url, {
            timeout: 8000, // Increased timeout
            maxRedirects: 3,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        return response.data;
    } catch (error) {
        // console.log(`Failed to fetch ${url}: ${error.message}`);
        return null;
    }
}

function analyzeContent(html, url, title, desc) {
    const $ = cheerio.load(html || '');
    
    let pageTitle = '';
    let pageDesc = '';
    let bodyText = '';
    
    if (html) {
        pageTitle = $('title').text().trim();
        pageDesc = $('meta[name="description"]').attr('content') || '';
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000);
    }

    // Strong Signals: URL, Manual Title/Desc, Page Title, Page Meta Desc
    const strongText = [url, title, desc, pageTitle, pageDesc].join(' ').toLowerCase();
    
    // Weak Signals: Body text
    const weakText = bodyText.toLowerCase();

    const hasStrong = (keywords) => keywords.some(k => strongText.includes(k));
    const hasAny = (keywords) => keywords.some(k => strongText.includes(k) || weakText.includes(k));

    // --- PRIORITY 1: Core Community (Forums & Q&A) ---
    if (hasStrong(['forum', 'bbs', 'discuz', 'v2ex', 'nodeseek', 'linux.do', 'discuss', 'q&a', 'stackoverflow', 'zhihu', 'segmentfault', '问答', '论坛', '社区', '圈子'])) {
        if (hasStrong(['q&a', 'stackoverflow', 'zhihu', 'segmentfault', '问答'])) return { cat: CATEGORIES.COMMUNITY.id, sub: CATEGORIES.COMMUNITY.subs.QNA };
        return { cat: CATEGORIES.COMMUNITY.id, sub: CATEGORIES.COMMUNITY.subs.FORUMS };
    }
    if (hasStrong(['opensource', 'github', 'gitlab'])) return { cat: CATEGORIES.COMMUNITY.id, sub: CATEGORIES.COMMUNITY.subs.OPENSOURCE_COMM };

    // --- PRIORITY 2: Directory (Navigation & Collections) ---
    if (hasStrong(['navigation', 'directory', 'startpage', 'collection', 'list', 'awesome', 'resources', 'index', '导航', '索引', '合集', '书签', '大全'])) {
        if (hasStrong(['tool', 'tools'])) return { cat: CATEGORIES.DIRECTORY.id, sub: CATEGORIES.DIRECTORY.subs.TOOL_COLLECTION };
        if (hasStrong(['nav', 'start', 'home'])) return { cat: CATEGORIES.DIRECTORY.id, sub: CATEGORIES.DIRECTORY.subs.WEB_NAV };
        return { cat: CATEGORIES.DIRECTORY.id, sub: CATEGORIES.DIRECTORY.subs.RESOURCE_INDEX };
    }

    // --- PRIORITY 3: Content (News, Blogs, Wiki) ---
    // News & Media
    if (hasStrong(['news', 'daily', 'weekly', 'times', 'report', 'journal', 'media', 'press', 'feed', 'rss', '新闻', '日报', '周刊', '媒体', '资讯'])) {
        return { cat: CATEGORIES.CONTENT.id, sub: CATEGORIES.CONTENT.subs.NEWS };
    }

    // Blogs & Articles (Broad catch)
    if (hasStrong(['blog', 'article', 'post', 'essay', 'writing', 'thought', 'story', 'medium', 'substack', '博客', '文章', '阅读', '笔记'])) {
        if (hasStrong(['tech', 'code', 'dev', 'design', '技术'])) return { cat: CATEGORIES.CONTENT.id, sub: CATEGORIES.CONTENT.subs.TECH_BLOG };
        return { cat: CATEGORIES.CONTENT.id, sub: CATEGORIES.CONTENT.subs.THEMATIC };
    }

    // Tutorials & Docs
    if (hasStrong(['tutorial', 'guide', 'doc', 'documentation', 'manual', 'learn', 'course', 'howto', 'handbook', '教程', '指南', '文档', '手册', '学习'])) {
        return { cat: CATEGORIES.CONTENT.id, sub: CATEGORIES.CONTENT.subs.TUTORIALS };
    }
    
    // Wiki & Knowledge
    if (hasStrong(['wiki', 'knowledge', 'encyclopedia', 'database', 'archive', '百科', '知识库'])) {
        return { cat: CATEGORIES.CONTENT.id, sub: CATEGORIES.CONTENT.subs.WIKI };
    }

    // --- PRIORITY 4: Tools (Functional & Interactive) ---
    // AI Tools
    if (hasStrong(['ai', 'gpt', 'llm', 'chatgpt', 'midjourney', 'stable diffusion', 'bot', 'copilot', 'model', 'translator', 'ocr', 'gen', 'artificial intelligence', '智能', '模型', '生成'])) {
         if (!hasStrong(['blog', 'news', 'article', 'report'])) { // Exclude news about AI
             return { cat: CATEGORIES.TOOLS.id, sub: CATEGORIES.TOOLS.subs.AI_TOOLS };
         }
    }
    
    // Dev Tools & API
    if (hasStrong(['api', 'sdk', 'json', 'formatter', 'regex', 'compiler', 'ide', 'editor', 'debug', 'test', 'convert', 'minify', 'encrypt', 'decrypt', 'hash', '开发工具', '调试', '接口', '格式化'])) {
        if (hasStrong(['api', 'sdk'])) return { cat: CATEGORIES.TOOLS.id, sub: CATEGORIES.TOOLS.subs.API_SERVICES };
        return { cat: CATEGORIES.TOOLS.id, sub: CATEGORIES.TOOLS.subs.DEV_TOOLS };
    }

    // Media Processing
    if (hasStrong(['image', 'photo', 'video', 'audio', 'compress', 'resize', 'editor', 'converter', 'remove background', 'watermark', '图片', '视频', '音频', '压缩', '剪辑', '去背'])) {
        if (hasStrong(['video', 'movie'])) return { cat: CATEGORIES.TOOLS.id, sub: CATEGORIES.TOOLS.subs.VIDEO_PROCESS };
        return { cat: CATEGORIES.TOOLS.id, sub: CATEGORIES.TOOLS.subs.IMAGE_PROCESS };
    }

    // File Conversion
    if (hasStrong(['convert', 'pdf', 'docx', 'format', 'transform', '转换', '格式'])) {
        return { cat: CATEGORIES.TOOLS.id, sub: CATEGORIES.TOOLS.subs.FILE_CONVERT };
    }

    // General Online Tools
    if (hasStrong(['tool', 'calculator', 'generator', 'checker', 'speedtest', 'whois', 'ping', '工具', '计算器', '生成器', '查询'])) {
        return { cat: CATEGORIES.TOOLS.id, sub: CATEGORIES.TOOLS.subs.ONLINE_TOOLS };
    }

    // --- PRIORITY 5: Personal (Blogs & Portfolios) ---
    // Often contain "blog" but focus on a person
    if (hasStrong(['personal', 'resume', 'cv', 'portfolio', 'me', 'about', 'profile', '个人', '简历', '作品集'])) {
        if (hasStrong(['blog'])) return { cat: CATEGORIES.PERSONAL.id, sub: CATEGORIES.PERSONAL.subs.PERSONAL_BLOG };
        if (hasStrong(['resume', 'cv'])) return { cat: CATEGORIES.PERSONAL.id, sub: CATEGORIES.PERSONAL.subs.RESUME };
        return { cat: CATEGORIES.PERSONAL.id, sub: CATEGORIES.PERSONAL.subs.PERSONAL_HOME };
    }

    // --- PRIORITY 6: Product & Business ---
    if (hasStrong(['pricing', 'plan', 'enterprise', 'business', 'solution', 'service', 'agency', 'studio', 'corp', 'inc', 'ltd', '价格', '方案', '企业', '服务'])) {
        if (hasStrong(['price', 'plan', 'subscription'])) return { cat: CATEGORIES.BUSINESS.id, sub: CATEGORIES.BUSINESS.subs.PRICING };
        return { cat: CATEGORIES.BUSINESS.id, sub: CATEGORIES.BUSINESS.subs.CORP_HOME };
    }

    if (hasStrong(['download', 'app', 'software', 'client', 'desktop', 'mobile', 'ios', 'android', 'mac', 'windows', '下载', '客户端', '应用'])) {
        return { cat: CATEGORIES.PRODUCT.id, sub: CATEGORIES.PRODUCT.subs.APP_DOWNLOAD };
    }

    if (hasStrong(['saas', 'platform', 'cloud', 'product', 'landing', 'feature', '平台', '产品'])) {
        return { cat: CATEGORIES.PRODUCT.id, sub: CATEGORIES.PRODUCT.subs.SAAS };
    }

    // --- PRIORITY 7: Social Profiles (Lower Priority) ---
    if (hasStrong(['social', 'twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'discord', 'telegram', '社交', '微博'])) {
        return { cat: CATEGORIES.COMMUNITY.id, sub: CATEGORIES.COMMUNITY.subs.SOCIAL_PROFILES };
    }

    // Fallbacks
    if (url.includes('github.io') || url.includes('.me') || url.includes('.blog')) {
        return { cat: CATEGORIES.PERSONAL.id, sub: CATEGORIES.PERSONAL.subs.PERSONAL_BLOG };
    }
    
    // Final default
    return { cat: 'others', sub: 'others' };
}

async function classify() {
    if (!fs.existsSync(bookmarksPath)) {
        console.error('Bookmarks file not found!');
        return;
    }

    const rawData = fs.readFileSync(bookmarksPath, 'utf8');
    let bookmarks;
    try {
        bookmarks = JSON.parse(rawData);
    } catch (e) {
        console.error('Invalid JSON');
        return;
    }

    // Deduplication
    const seenUrls = new Set();
    const uniqueBookmarks = [];
    for (const b of bookmarks) {
        if (!b.url) continue;
        let normalizedUrl = b.url.trim();
        // Simple normalization: remove trailing slash if path is not empty
        // Actually, let's keep it simple.
        if (seenUrls.has(normalizedUrl)) continue;
        seenUrls.add(normalizedUrl);
        uniqueBookmarks.push(b);
    }

    console.log(`Starting classification for ${uniqueBookmarks.length} bookmarks...`);
    const processedBookmarks = [];
    const BATCH_SIZE = 5; // Reduced batch size for stability
    
    for (let i = 0; i < uniqueBookmarks.length; i += BATCH_SIZE) {
        const batch = uniqueBookmarks.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (item) => {
            let html = await fetchPage(item.url);
            const result = analyzeContent(html, item.url, item.title, item.desc);
            
            // Log classification for verification
            // console.log(`[${result.cat}/${result.sub}] ${item.title}`);
            
            return {
                ...item,
                category: result.cat,
                secondaryCategory: result.sub
            };
        });

        const results = await Promise.all(promises);
        processedBookmarks.push(...results);
        console.log(`Processed ${processedBookmarks.length}/${uniqueBookmarks.length}`);
    }

    fs.writeFileSync(bookmarksPath, JSON.stringify(processedBookmarks, null, 2));
    console.log('Bookmarks reclassified with 7-Category "Classifier Pro" Logic.');
}

classify();
