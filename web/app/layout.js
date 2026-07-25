import './globals.css';
import NavBar from '@/components/NavBar';
import PageTracker from '@/components/PageTracker';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { withBase } from '@/lib/utils';

export const metadata = {
    title: '星空笔记 — 夏日科技探索',
    icons: { icon: withBase('/img/favicon256.png') },
};

const themeInitScript = `
(function(){
    try{
        var t=localStorage.getItem("theme");
        var d=t?(t==="dark"):window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark",d);
    }catch(e){}
})();
`;

export default function RootLayout({ children }) {
    return (
        <html lang="zh-CN" className="dark" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
                <meta name="theme-color" content="#0B1120" media="(prefers-color-scheme: dark)" />
                <meta name="theme-color" content="#F8FAFC" media="(prefers-color-scheme: light)" />
                <link rel="preconnect" href="https://fonts.loli.net" />
                <link rel="preconnect" href="https://gstatic.loli.net" crossOrigin="anonymous" />
                <link
                    href="https://fonts.loli.net/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="flex min-h-screen flex-col font-sans antialiased">
                <TooltipProvider>
                    <NavBar />
                    <PageTracker />
                    {children}
                    <Toaster />
                </TooltipProvider>
            </body>
        </html>
    );
}
