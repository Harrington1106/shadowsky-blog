
// 允许跨域 (如果需要)
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Content-Type", "application/json; charset=UTF-8");

// 数据文件路径 (相对于当前文件或根目录，根据文档应该是根目录绝对路径)
// 文档提示: "不管云函数文件在哪里，都需要使用完整的绝对路径"
// 假设 'data/visits.json' 是相对于根目录的路径
const DATA_FILE = "data/visits.json";

// 获取当前页面的 ID (从查询参数)
const pageId = req.query.page || "home";

let visits = {};

// 1. 读取现有数据
if (fs.existsSync(DATA_FILE)) {
    try {
        const content = fs.readFileSync(DATA_FILE);
        visits = JSON.parse(content);
    } catch (e) {
        // 如果出错，重置为空对象
        visits = {};
    }
}

// 2. 更新计数
if (!visits[pageId]) {
    visits[pageId] = 0;
}
visits[pageId]++;

// 3. 写入文件
try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(visits));
} catch (e) {
    res.status(500);
    res.json({ error: "Failed to save data" });
    return;
}

// 4. 返回结果
res.json({ 
    page: pageId, 
    count: visits[pageId] 
});
