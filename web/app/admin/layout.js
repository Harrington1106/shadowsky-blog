import AdminShell from './AdminShell';

// 后台不该进搜索结果。/admin 本身有 middleware 拦着,但 /admin/login 是公开可访问的,
// 之前没有任何 noindex 标记 —— 这层服务端 layout 就是为了把这个头加上。
export const metadata = {
    title: '管理后台',
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
    return <AdminShell>{children}</AdminShell>;
}
