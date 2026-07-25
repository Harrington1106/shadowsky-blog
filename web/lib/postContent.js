/**
 * 文章内容处理 —— 移植自 ../../js/post-viewer.js 中与渲染无关的纯函数部分
 */

export const CATEGORY_IMAGES = {
    '天文': 'https://images.unsplash.com/photo-1519681393784-d8e5b5a4570e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    '天文观测': 'https://images.unsplash.com/photo-1519681393784-d8e5b5a4570e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    '技术': 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    '技术思考': 'https://images.unsplash.com/photo-1547658719-da2b51169166?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    '博客运维': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    '生活': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    '日记': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    'default': 'https://images.unsplash.com/photo-1499750310159-5b5f2269592b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
};

export function calculateReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    const chineseChars = (text.match(/[一-龥]/g) || []).length;
    return Math.max(1, Math.ceil((words + chineseChars) / 400));
}

/** 简易 front matter (YAML) 解析器 */
export function parseFrontMatter(rawText) {
    const result = { metadata: {}, content: rawText };
    let text = rawText;
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    text = text.trimStart();

    if (text.startsWith('---')) {
        const endMatch = text.indexOf('---', 3);
        if (endMatch !== -1) {
            const yamlBlock = text.substring(3, endMatch);
            result.content = text.substring(endMatch + 3).trim();
            const lines = yamlBlock.split('\n');
            let currentKey = null;

            lines.forEach((line) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return;

                if (trimmedLine.startsWith('-')) {
                    if (currentKey && Array.isArray(result.metadata[currentKey])) {
                        let val = trimmedLine.slice(1).trim();
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            val = val.slice(1, -1);
                        }
                        result.metadata[currentKey].push(val);
                    }
                    return;
                }

                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const key = line.substring(0, colonIndex).trim();
                    let value = line.substring(colonIndex + 1).trim();

                    if (value.startsWith('[') && value.endsWith(']')) {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            const inner = value.slice(1, -1);
                            value = inner.split(',').map((item) => {
                                item = item.trim();
                                if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
                                    return item.slice(1, -1);
                                }
                                return item;
                            }).filter(Boolean);
                        }
                        currentKey = key;
                        result.metadata[key] = value;
                    } else if (!value) {
                        currentKey = key;
                        result.metadata[key] = [];
                    } else {
                        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        currentKey = key;
                        result.metadata[key] = value;
                    }
                }
            });
        }
    } else if (text.startsWith('# ')) {
        const lines = text.split('\n');
        result.metadata.title = lines[0].trim().replace(/^#\s+/, '');
        result.content = text;
    } else {
        const lines = text.split('\n');
        let i = 0;
        while (i < lines.length && i < 10) {
            const line = lines[i].trim();
            if (!line) { i++; continue; }
            const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
            if (match) {
                result.metadata[match[1]] = match[2];
                i++;
            } else break;
        }
        if (i > 0) result.content = lines.slice(i).join('\n').trim();
    }

    return result;
}

export function normalizeTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return tags.toString().replace(/^\[|\]$/g, '').split(/,\s*/).filter(Boolean);
}
