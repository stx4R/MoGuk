import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { OnlineUsersProvider } from '@/components/providers/OnlineUsersContext';
import { PIPChatProvider } from '@/components/providers/PIPChatContext';
import UserSessionManager from '@/components/providers/UserSessionManager';
import PIPChat from '@/components/chat/PIPChat';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnnouncementBanner from '@/components/layout/AnnouncementBanner';
// /voteresult 결과 팝업 — 비로그인 포함 전원 수신 S
import VoteResultModal from '@/components/vote/VoteResultModal';

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
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="오량모의국회" />
        {/* 우클릭/개발자도구 차단 — React 하이드레이션 전 동기 실행 S */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){
const preventAction=function(e){e.preventDefault();e.stopPropagation();e.returnValue=false;};
setInterval(function(){
  if(document.oncontextmenu!==false){document.oncontextmenu=function(){return false;};window.oncontextmenu=function(){return false;};}
},50);
window.addEventListener('keydown',function(e){
  var key=(e.key||'').toLowerCase();var kc=e.keyCode;
  if(key==='f12'||kc===123){preventAction(e);}
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&['i','j','c','u'].includes(key)){preventAction(e);}
  if((e.ctrlKey||e.metaKey)&&['s','p'].includes(key)){preventAction(e);}
},true);
document.addEventListener('contextmenu',preventAction,true);
setInterval(function(){
  var t=performance.now();
  debugger;
  if(performance.now()-t>100){void 0;}
},100);
})();` }} />
      </head>
      <body className="min-h-full flex flex-col bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>
          <OnlineUsersProvider>
            <PIPChatProvider>
              <UserSessionManager />
              {/* 공지 배너 — 페이지 콘텐츠를 자연스럽게 아래로 밀어냄 S */}
              <AnnouncementBanner />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <PIPChat />
              <VoteResultModal />
            </PIPChatProvider>
          </OnlineUsersProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
