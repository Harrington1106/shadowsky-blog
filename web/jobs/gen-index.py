"""Generate index.json from ai-daily markdown files."""
import json, os, re, sys

data_dir = sys.argv[1] if len(sys.argv) > 1 else "public/data/ai-daily"
if not os.path.isdir(data_dir):
    print(f"Directory not found: {data_dir}")
    sys.exit(1)


def extract_summary(content: str) -> str:
    """Prefer 今日看点; fall back to top medals / first blockquotes."""
    # 1) 今日看点 section body (until next heading or ---)
    m = re.search(
        r"##\s*📝\s*今日看点\s*\n+([\s\S]*?)(?=\n---|\n##\s)",
        content,
    )
    if m:
        text = re.sub(r"\s+", " ", m.group(1)).strip()
        if text:
            return text[:220] + ("…" if len(text) > 220 else "")

    # 2) Medal lines under 今日必读
    medals = re.findall(r"^[🥇🥈🥉]\s*\*\*(.+?)\*\*", content, re.MULTILINE)
    if medals:
        joined = " · ".join(medals[:3])
        return joined[:220] + ("…" if len(joined) > 220 else "")

    # 3) First few blockquotes
    quotes = re.findall(r"^>\s+(.+)$", content, re.MULTILINE)
    quotes = [q for q in quotes if q and not q.startswith("来自")]
    if quotes:
        joined = " · ".join(quotes[:2])
        return joined[:220] + ("…" if len(joined) > 220 else "")

    return ""


index = []
for fname in sorted(os.listdir(data_dir), reverse=True):
    if not fname.endswith(".md"):
        continue
    fpath = os.path.join(data_dir, fname)
    date_str = fname.replace(".md", "")

    with open(fpath, encoding="utf-8") as f:
        content = f.read()

    title = ""
    for line in content.split("\n"):
        if line.startswith("# ") and not title:
            title = line.lstrip("# ").strip()
            break

    summary = extract_summary(content)
    article_count = len(re.findall(r"^### ", content, re.MULTILINE))

    index.append({
        "date": date_str,
        "file": fname,
        "title": title,
        "summary": summary,
        "articleCount": article_count,
    })

with open(os.path.join(data_dir, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print(f"index.json: {len(index)} entries")
