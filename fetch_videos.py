import urllib.request
import json
import time
import random

def get_videos(mid):
    url = f"https://api.bilibili.com/x/space/arc/search?mid={mid}&ps=30&tid=0&pn=1&keyword=&order=pubdate&jsonp=jsonp"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": f"https://space.bilibili.com/{mid}/video",
        "Origin": "https://space.bilibili.com",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = response.read().decode('utf-8')
            return json.loads(data)
    except Exception as e:
        return {"error": str(e)}

mid = "510141669"
result = get_videos(mid)

if result.get('code') == 0:
    vlist = result.get('data', {}).get('list', {}).get('vlist', [])
    print("const defaultVideos = [")
    for i, v in enumerate(vlist):
        print("    {")
        print(f"        id: {i+1},")
        print(f"        title: {json.dumps(v['title'], ensure_ascii=False)},")
        print(f"        thumbnail: {json.dumps(v['pic'].replace('http:', 'https:'))},")
        print(f"        duration: {json.dumps(v['length'])},")
        print(f"        views: {json.dumps(str(v['play']))},")
        print(f"        category: 'other', // Update category manually if needed")
        print(f"        type: 'bilibili',")
        print(f"        bvid: {json.dumps(v['bvid'])}")
        print("    },")
    print("];")
else:
    print(json.dumps(result, ensure_ascii=False, indent=2))
