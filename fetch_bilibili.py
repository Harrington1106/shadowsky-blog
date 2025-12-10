import urllib.request
import json
import sys

url = "https://api.bilibili.com/x/space/wbi/arc/search?mid=510141669&ps=30&tid=0&pn=1&keyword=&order=pubdate"
# Note: WBI might be required now, but let's try the old endpoint or the wbi one without signature first (might fail)
# Old endpoint:
url = "https://api.bilibili.com/x/space/arc/search?mid=510141669&ps=30&tid=0&pn=1&keyword=&order=pubdate"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Referer": "https://space.bilibili.com/510141669/video"
}

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        data = response.read().decode('utf-8')
        print(data)
except Exception as e:
    print(f"Error: {e}")
