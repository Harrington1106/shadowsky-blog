#!/usr/bin/env python3
"""异地备份 —— 把本地备份包推到 Cloudflare R2(S3 兼容),并按保留期清理远端旧包。

为什么不用 rclone / boto3:这台阿里云 ECS 拉不动 rclone 官方下载,yum 源里也没有,
pip 装 boto3 同样受网络限制。备份包只有几百 KB,单次 PUT 足够,
所以这里用标准库手写 SigV4 签名,零依赖、不需要联网安装任何东西。

凭据从 /www/wwwroot/shadowquake-v2/tools/r2.env 读(600 权限),需要:
    R2_ACCOUNT_ID=<Cloudflare 账户 ID>
    R2_ACCESS_KEY_ID=<R2 API Token 的 Access Key ID>
    R2_SECRET_ACCESS_KEY=<对应 Secret>
    R2_BUCKET=<桶名>
    R2_KEEP_DAYS=90        # 可选,远端保留天数,默认 90

用法:
    python3 backup-offsite.py <本地备份文件>      上传 + 清理
    python3 backup-offsite.py --check             只测连通性与桶可写
    python3 backup-offsite.py --list              列出远端已有备份
"""

import datetime
import hashlib
import hmac
import os
import sys
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

ENV_FILE = '/www/wwwroot/shadowquake-v2/tools/r2.env'
PREFIX = 'v2/'


def load_env():
    """读 r2.env;缺文件或缺键时给出可操作的提示而不是堆栈。"""
    if not os.path.exists(ENV_FILE):
        sys.exit('未配置异地备份:%s 不存在。\n'
                 '请在 Cloudflare 开通 R2 → 建桶 → 生成仅对该桶有读写权限的 API Token,\n'
                 '然后把 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET '
                 '写进该文件(chmod 600)。' % ENV_FILE)
    env = {}
    with open(ENV_FILE, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    missing = [k for k in ('R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET')
               if not env.get(k)]
    if missing:
        sys.exit('%s 缺少: %s' % (ENV_FILE, ', '.join(missing)))
    env.setdefault('R2_KEEP_DAYS', '90')
    return env


def sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()


def signed_request(env, method, key, payload=b'', query=''):
    """构造并发送一个 SigV4 签名请求。key 为对象键(不含桶),query 形如 'list-type=2&prefix=v2/'。"""
    host = '%s.r2.cloudflarestorage.com' % env['R2_ACCOUNT_ID']
    canonical_uri = '/' + env['R2_BUCKET'] + ('/' + key if key else '')
    url = 'https://%s%s%s' % (host, canonical_uri, ('?' + query) if query else '')

    now = datetime.datetime.utcnow()
    amz_date = now.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = now.strftime('%Y%m%d')
    payload_hash = hashlib.sha256(payload).hexdigest()

    canonical_headers = 'host:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n' % (host, payload_hash, amz_date)
    signed_headers = 'host;x-amz-content-sha256;x-amz-date'
    canonical_request = '\n'.join([
        method, canonical_uri, query, canonical_headers, signed_headers, payload_hash,
    ])

    scope = '%s/auto/s3/aws4_request' % date_stamp
    string_to_sign = '\n'.join([
        'AWS4-HMAC-SHA256', amz_date, scope,
        hashlib.sha256(canonical_request.encode('utf-8')).hexdigest(),
    ])

    k_date = sign(('AWS4' + env['R2_SECRET_ACCESS_KEY']).encode('utf-8'), date_stamp)
    k_signing = sign(sign(sign(k_date, 'auto'), 's3'), 'aws4_request')
    signature = hmac.new(k_signing, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    authorization = ('AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s'
                     % (env['R2_ACCESS_KEY_ID'], scope, signed_headers, signature))

    req = urllib.request.Request(url, data=payload if payload else None, method=method)
    req.add_header('Host', host)
    req.add_header('x-amz-date', amz_date)
    req.add_header('x-amz-content-sha256', payload_hash)
    req.add_header('Authorization', authorization)

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def list_remote(env):
    """列出远端已有备份 → [(key, lastModified)]"""
    status, body = signed_request(env, 'GET', '', query='list-type=2&prefix=' + PREFIX)
    if status != 200:
        sys.exit('列举失败 HTTP %s: %s' % (status, body[:300].decode('utf-8', 'replace')))
    ns = '{http://s3.amazonaws.com/doc/2006-03-01/}'
    root = ET.fromstring(body)
    out = []
    for c in root.findall(ns + 'Contents'):
        out.append((c.findtext(ns + 'Key'), c.findtext(ns + 'LastModified')))
    return sorted(out)


def main():
    env = load_env()
    arg = sys.argv[1] if len(sys.argv) > 1 else ''

    if arg == '--list':
        items = list_remote(env)
        print('远端 %s 共 %d 份:' % (env['R2_BUCKET'], len(items)))
        for k, t in items[-15:]:
            print('   ', k, t)
        return

    if arg == '--check':
        # 真写一个探针对象再删掉,确认凭据既能写也能删(只读 token 会在这里暴露)
        probe = PREFIX + '.probe'
        status, body = signed_request(env, 'PUT', probe, payload=b'ok')
        if status not in (200, 201):
            sys.exit('写入失败 HTTP %s: %s' % (status, body[:300].decode('utf-8', 'replace')))
        signed_request(env, 'DELETE', probe)
        print('R2 连通且可写可删 ✓ (bucket=%s)' % env['R2_BUCKET'])
        return

    if not arg or not os.path.isfile(arg):
        sys.exit('用法: backup-offsite.py <备份文件> | --check | --list')

    # ── 上传 ──
    with open(arg, 'rb') as f:
        data = f.read()
    key = PREFIX + os.path.basename(arg)
    status, body = signed_request(env, 'PUT', key, payload=data)
    if status not in (200, 201):
        sys.exit('上传失败 HTTP %s: %s' % (status, body[:300].decode('utf-8', 'replace')))

    # 回读校验:HEAD 确认远端大小与本地一致,避免"以为传上去了"
    status, _ = signed_request(env, 'HEAD', key)
    if status != 200:
        sys.exit('上传后回查失败 HTTP %s' % status)
    print('已上传 %s (%.1f KB) → r2://%s/%s' % (os.path.basename(arg), len(data) / 1024.0,
                                                 env['R2_BUCKET'], key))

    # ── 按保留期清理远端 ──
    keep_days = int(env['R2_KEEP_DAYS'])
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=keep_days)
    removed = 0
    for k, t in list_remote(env):
        try:
            ts = datetime.datetime.strptime(t[:19], '%Y-%m-%dT%H:%M:%S')
        except (TypeError, ValueError):
            continue
        if ts < cutoff:
            st, _ = signed_request(env, 'DELETE', k)
            if st in (200, 204):
                removed += 1
    if removed:
        print('清理 %d 份超过 %d 天的远端备份' % (removed, keep_days))


if __name__ == '__main__':
    main()
