"""Generate index.json from ai-daily markdown files."""
import json, os, re, sys

data_dir = sys.argv[1] if len(sys.argv) > 1 else "public/data/ai-daily"
if not os.path.isdir(data_dir):
    print(f"Directory not found: {data_dir}")
    sys.exit(1)

index = []
for fname in sorted(os.listdir(data_dir), reverse=True):
    if not fname.endswith(".md"):
        continue
    fpath = os.path.join(data_dir, fname)
    date_str = fname.replace(".md", "")

    with open(fpath, encoding="utf-8") as f:
        content = f.read()

    title = ""
    summary = ""
    for line in content.split("\n"):
        if line.startswith("# ") and not title:
            title = line.lstrip("# ").strip()
        if summary:
            break

    article_count = len(re.findall(r"^### ", content, re.MULTILINE))

    index.append({
        "date": date_str,
        "file": fname,
        "title": title,
        "summary": summary,
        "articleCount": article_count
    })

with open(os.path.join(data_dir, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print(f"index.json: {len(index)} entries")
