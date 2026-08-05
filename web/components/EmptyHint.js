/**
 * 空状态：虚线框 + 图标 + 一句话，可选第二行补充说明。
 *
 * ACG 各页原先是一行 `py-16 text-center` 的灰字，和骨架屏一样都是「页面上什么都没有」，
 * 分不出到底是还在加载还是真的空。虚线框给了个明确的边界：这块地方就是空的。
 */
export default function EmptyHint({ icon: Icon, text, hint }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-sm text-muted-foreground">
            {Icon && <Icon size={20} className="opacity-50" />}
            <span>{text}</span>
            {hint && <span className="text-xs opacity-70">{hint}</span>}
        </div>
    );
}
