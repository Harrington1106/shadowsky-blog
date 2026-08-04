import path from 'node:path';
import { spawn } from 'node:child_process';
import { requireAuth } from '@/lib/requireAuth';
import { devOnly, resolveFile } from '@/lib/publishLocal';

export const dynamic = 'force-dynamic';

/**
 * 跑 publish-post.mjs，把它的 stdout/stderr 原样流回前端。
 *
 * 为什么是流而不是等它跑完再返回：发布要抓图、转 webp、scp、清 CDN 缓存、
 * 再 curl 验证，正常十几秒。一次性返回的话按钮按下去就是十几秒空白，
 * 出问题也看不出卡在哪一步。
 */
export async function POST(req) {
    const gone = devOnly();
    if (gone) return gone;
    const guard = await requireAuth();
    if (guard) return guard;

    const { file, mode, stripH1, src } = await req.json();

    let target;
    try {
        // publish-post.mjs 认「存在的路径」也认「草稿箱里的裸文件名」。
        // 重发已发布的文章就把 content/posts 下的完整路径给它。
        target = src === 'post' ? resolveFile(file, 'post') : path.basename(String(file || ''));
        if (src !== 'post') resolveFile(file, 'draft');   // 先确认草稿真的在，不然错误要等子进程才报
    } catch (e) {
        return Response.json({ error: String(e.message) }, { status: 400 });
    }

    const argv = [path.join(process.cwd(), 'scripts', 'publish-post.mjs'), target];
    if (mode === 'preview') argv.push('--preview');
    if (stripH1) argv.push('--strip-h1');

    const child = spawn(process.execPath, argv, { cwd: process.cwd(), env: process.env });

    const stream = new ReadableStream({
        start(controller) {
            const enc = new TextEncoder();
            const push = (d) => controller.enqueue(enc.encode(d.toString()));
            child.stdout.on('data', push);
            child.stderr.on('data', push);
            child.on('close', (code) => {
                controller.enqueue(enc.encode(`\n[退出码 ${code}]\n`));
                controller.close();
            });
            child.on('error', (e) => {
                controller.enqueue(enc.encode(`\n启动失败: ${e.message}\n`));
                controller.close();
            });
        },
        cancel() { child.kill(); },
    });

    return new Response(stream, {
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
}
