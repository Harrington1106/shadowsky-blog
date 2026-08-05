/**
 * 页面头部的统计小药丸（「12 部在追」这类）。
 *
 * 原本 /moments 与 /bookmarks 各抄了一份一模一样的实现，/acg 是第三处 ——
 * 提到这里，改一次三页都变。
 */
export default function StatChip({ icon: Icon, value, label }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Icon size={12} className="opacity-60" />
            <strong className="font-semibold text-foreground tabular-nums">{value}</strong>
            {label}
        </span>
    );
}
