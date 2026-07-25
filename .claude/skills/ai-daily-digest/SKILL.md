# AI Daily Digest

从 92 个顶级技术博客抓取最新文章，AI 评分筛选，生成每日精选日报。

## 触发命令

`/digest` — 运行 AI 日报生成

## 执行流程

### Step 0: 检查配置

```bash
cat ~/.hn-daily-digest/config.json 2>/dev/null || echo "{}"
```

如果已有配置，使用已保存配置。主 provider 为**硅基流动 SiliconFlow**（DeepSeek-V3），Gemini / 其它 OpenAI 兼容为 fallback。

### Step 1: 收集参数

使用 `AskUserQuestion` 交互式收集：

| 参数 | 选项 | 默认 |
|------|------|------|
| 时间范围 | 24h / 48h / 72h / 7天 | 48h |
| 精选数量 | 10 / 15 / 20 篇 | 10 篇 |
| 输出语言 | 中文 / English | **中文** |

### Step 2: API Key

优先使用硅基流动 Key（https://cloud.siliconflow.cn/account/ak）。服务器写入站点根目录 `.env`（勿提交 git）：

```bash
SILICONFLOW_API_KEY=sk-...
SILICONFLOW_MODEL=deepseek-ai/DeepSeek-V3.2   # 可选
```

可选 fallback：`GEMINI_API_KEY` 或 `OPENAI_API_KEY`。

### Step 3: 执行

```bash
export SILICONFLOW_API_KEY="<用户提供的key>"
npx -y tsx .claude/skills/ai-daily-digest/scripts/digest.ts \
  --hours <timeRange> \
  --top-n <topN> \
  --lang <zh|en> \
  --output public/data/ai-daily/$(date +%Y-%m-%d).md
```

### Step 4: 生成索引

```bash
python3 .claude/skills/ai-daily-digest/gen-index.py public/data/ai-daily/
```

### Step 5: 保存配置

```bash
mkdir -p ~/.hn-daily-digest
# 保存 config.json
```

## 信息源

来自 [Hacker News Popularity Contest 2025](https://refactoringenglish.com/tools/hn-popularity/)，由 Andrej Karpathy 推荐，包括 simonwillison.net、paulgraham.com、gwern.net 等 92 个顶级技术博客。

## 环境要求

- `tsx`（全局安装：`npm i -g tsx`）
- `SILICONFLOW_API_KEY`（主）或 Gemini / OpenAI 兼容 Key（fallback）
