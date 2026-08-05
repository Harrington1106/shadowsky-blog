'use client';

import MediaLibrary from '@/components/MediaLibrary';
import { MANGA_FILTERS } from '@/lib/media';

export default function MangaPage() {
    return (
        <MediaLibrary
            type="manga"
            eyebrow="Manga Library"
            title="我的漫画"
            filters={MANGA_FILTERS}
            searchPlaceholder="搜索漫画标题"
            pageId="manga"
        />
    );
}
