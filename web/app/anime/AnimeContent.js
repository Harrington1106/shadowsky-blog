'use client';

import MediaLibrary from '@/components/MediaLibrary';
import { ANIME_FILTERS } from '@/lib/media';

export default function AnimePage() {
    return (
        <MediaLibrary
            type="anime"
            eyebrow="Anime Library"
            title="我的追番"
            filters={ANIME_FILTERS}
            searchPlaceholder="搜索番剧标题"
            pageId="anime"
        />
    );
}
