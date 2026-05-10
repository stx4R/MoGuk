import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import UserSessionManager from '@/components/providers/UserSessionManager';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnnouncementBanner from '@/components/layout/AnnouncementBanner';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '제 3회 오량모의국회',
  description: '제 3회 오량모의국회 공식 웹사이트입니다.',
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      {/* 브라우저 개발자 도구 차단 스크립트 S */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){const preventAction=(e)=>{e.preventDefault();e.stopPropagation();e.returnValue=false;};setInterval(()=>{if(document.oncontextmenu!==false){document.oncontextmenu=()=>false;window.oncontextmenu=()=>false;}},50);window.addEventListener('keydown',(e)=>{const key=e.key?.toLowerCase();const keyCode=e.keyCode;if(key==='f12'||keyCode===123){preventAction(e);}if((e.ctrlKey||e.metaKey)&&e.shiftKey&&['i','j','c','u'].includes(key)){preventAction(e);}if((e.ctrlKey||e.metaKey)&&['s','p'].includes(key)){preventAction(e);}},true);document.addEventListener('contextmenu',preventAction,true);setInterval(()=>{const s=performance.now();debugger;},100);})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          <UserSessionManager />
          {/* 공지 배너 — 페이지 콘텐츠를 자연스럽게 아래로 밀어냄 S */}
          <AnnouncementBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
