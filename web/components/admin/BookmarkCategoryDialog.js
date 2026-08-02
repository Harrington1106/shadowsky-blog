'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useConfirm } from '@/components/useConfirm';
import { apiGet, apiUpdate, apiDelete } from '@/lib/adminApi';

/** 后端存的是 { slug: 名 } 对象;编辑时用数组才好增删和保持顺序 */
function toRows(subcategories) {
    return Object.entries(subcategories || {}).map(([slug, name]) => ({ slug, name }));
}

/**
 * 收藏的分类管理。
 *
 * 为什么单独做:分类和子分类的中文名只存在 bookmark_categories 表里,
 * 之前后台完全没有入口——新增一个子分类 slug 之后,前台就只能显示 slug 本身。
 * (v1 的中文名存在 public/data/categories.json,迁 v2 时丢过一次。)
 */
export default function BookmarkCategoryDialog({ open, onOpenChange, onSaved }) {
    const [cats, setCats] = useState([]);
    const [orphans, setOrphans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [savingSlug, setSavingSlug] = useState(null);
    const [confirm, confirmDialog] = useConfirm();

    async function load() {
        setLoading(true);
        try {
            const data = await apiGet('/api/bookmark-categories');
            setCats(data.categories.map((c) => ({ ...c, subs: toRows(c.subcategories) })));
            setOrphans(data.orphans || []);
        } catch (e) { toast.error(e.message); }
        finally { setLoading(false); }
    }
    useEffect(() => { if (open) load(); }, [open]);

    /** 就地改某个分类的字段 */
    function patch(slug, fn) {
        setCats((list) => list.map((c) => (c.slug === slug ? fn({ ...c }) : c)));
    }

    async function saveCat(cat) {
        if (!cat.slug.trim()) { toast.error('分类 slug 不能为空'); return; }
        setSavingSlug(cat.slug);
        try {
            await apiUpdate('/api/bookmark-categories', {
                slug: cat.slug,
                name: cat.name,
                subcategories: cat.subs,
            });
            toast.success(`已保存「${cat.name || cat.slug}」`);
            await load();
            onSaved?.();
        } catch (e) { toast.error(e.message); }
        finally { setSavingSlug(null); }
    }

    async function removeCat(cat) {
        if (cat.count > 0) { toast.error(`还有 ${cat.count} 条收藏属于该分类,不能删`); return; }
        if (!await confirm({ title: `删除分类「${cat.name || cat.slug}」?`, description: '该分类下的子分类名也会一起消失。' })) return;
        try {
            await apiDelete(`/api/bookmark-categories?slug=${encodeURIComponent(cat.slug)}`);
            toast.success('已删除');
            await load();
            onSaved?.();
        } catch (e) { toast.error(e.message); }
    }

    /**
     * 新分类先只加在本地,填完 slug 和名字再保存。
     * 从孤儿一键补录时(orphan 有值)把它已经在用的子分类也一并列出来,省得手抄 slug。
     */
    function addCat(orphan = null) {
        const subCounts = orphan?.subCounts || {};
        setCats((list) => [...list, {
            slug: orphan?.slug || '',
            name: '',
            subs: Object.keys(subCounts).sort().map((s) => ({ slug: s, name: '' })),
            count: orphan?.count || 0,
            subCounts,
            isNew: true,
        }]);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                {confirmDialog}
                <DialogHeader>
                    <DialogTitle>分类管理</DialogTitle>
                </DialogHeader>

                <p className="-mt-1 text-xs text-muted-foreground">
                    这里的中文名决定收藏页上分组标题怎么显示。留空的话前台只能显示 slug。
                </p>

                {orphans.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                        <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                        <span>有收藏用了未登记的分类:</span>
                        {orphans.map((o) => (
                            <Button key={o.slug} size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => addCat(o)}>
                                <Plus className="size-3" />{o.slug} <span className="text-muted-foreground">({o.count})</span>
                            </Button>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {loading && <p className="py-6 text-center text-sm text-muted-foreground">加载中…</p>}

                    {!loading && cats.map((cat, i) => (
                        <Card key={cat.slug + i} className="py-0">
                            <CardContent className="flex flex-col gap-2 p-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        className="w-36 font-mono text-xs"
                                        placeholder="slug"
                                        value={cat.slug}
                                        disabled={!cat.isNew}
                                        onChange={(e) => patch(cat.slug, (c) => ({ ...c, slug: e.target.value }))}
                                    />
                                    <Input
                                        placeholder="中文名"
                                        value={cat.name}
                                        onChange={(e) => patch(cat.slug, (c) => ({ ...c, name: e.target.value }))}
                                    />
                                    <Badge variant="outline" className="shrink-0 text-[0.65rem]">{cat.count} 条</Badge>
                                    <Button size="icon" variant="ghost" disabled={savingSlug === cat.slug} onClick={() => saveCat(cat)} title="保存">
                                        <Save className="size-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => removeCat(cat)} title="删除分类">
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>

                                <div className="flex flex-col gap-1.5 border-l-2 border-border pl-3">
                                    {cat.subs.map((s, si) => (
                                        <div key={si} className="flex items-center gap-2">
                                            <Input
                                                className="w-32 font-mono text-xs"
                                                placeholder="子分类 slug"
                                                value={s.slug}
                                                onChange={(e) => patch(cat.slug, (c) => {
                                                    c.subs = c.subs.map((x, j) => (j === si ? { ...x, slug: e.target.value } : x));
                                                    return c;
                                                })}
                                            />
                                            <Input
                                                className="h-8"
                                                placeholder="中文名"
                                                value={s.name}
                                                onChange={(e) => patch(cat.slug, (c) => {
                                                    c.subs = c.subs.map((x, j) => (j === si ? { ...x, name: e.target.value } : x));
                                                    return c;
                                                })}
                                            />
                                            <span className="w-10 shrink-0 text-right text-[0.65rem] text-muted-foreground">
                                                {cat.subCounts[s.slug] || 0} 条
                                            </span>
                                            <Button size="icon" variant="ghost" className="size-8" title="移除子分类"
                                                onClick={() => patch(cat.slug, (c) => {
                                                    c.subs = c.subs.filter((_, j) => j !== si);
                                                    return c;
                                                })}>
                                                <Trash2 className="size-3.5 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button size="sm" variant="ghost" className="h-7 w-fit gap-1 text-xs"
                                        onClick={() => patch(cat.slug, (c) => {
                                            c.subs = [...c.subs, { slug: '', name: '' }];
                                            return c;
                                        })}>
                                        <Plus className="size-3" /> 子分类
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="outline" size="sm" onClick={() => addCat()}>
                        <Plus className="size-4" /> 新增分类
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>完成</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
