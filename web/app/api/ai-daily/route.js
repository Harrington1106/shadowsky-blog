import fs from 'node:fs';
import path from 'node:path';
import { aiDailyDir } from '@/lib/content';

export const dynamic = 'force-dynamic';

/** GET /api/ai-daily → AI 日报索引数组(读 index.json)。 */
export async function GET() {
    const file = path.join(aiDailyDir(), 'index.json');
    try {
        const idx = JSON.parse(fs.readFileSync(file, 'utf8')) || [];
        return Response.json(idx);
    } catch (e) {
        return Response.json([], { status: 200 });
    }
}
