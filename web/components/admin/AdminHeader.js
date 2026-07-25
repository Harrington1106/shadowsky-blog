/** 后台页面统一头部:标题 + 计数徽标 + 右侧动作 */
import { Badge } from '@/components/ui/badge';

export default function AdminHeader({ title, count, action }) {
    return (
        <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{title}</h1>
                {typeof count === 'number' && <Badge variant="secondary">{count}</Badge>}
            </div>
            {action}
        </div>
    );
}
