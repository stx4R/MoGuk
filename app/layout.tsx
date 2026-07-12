import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { OnlineUsersProvider } from '@/components/providers/OnlineUsersContext';
import { PIPChatProvider } from '@/components/providers/PIPChatContext';
import UserSessionManager from '@/components/providers/UserSessionManager';
import PIPChat from '@/components/chat/PIPChat';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnnouncementBanner from '@/components/layout/AnnouncementBanner';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://moguk.vercel.app'),
  title: '제 3회 오량모의국회',
  description: '제 3회 오량모의국회 공식 웹사이트입니다.',
  openGraph: {
    title: '제 3회 오량모의국회',
    description: '제 3회 오량모의국회 공식 웹사이트입니다.',
    images: [{ url: '/clubs/a-logo.png' }],
  },
  icons: {
    apple: [{ url: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: '제 3회 오량모의국회',
    statusBarStyle: 'black-translucent',
  },
  // Next 16의 appleWebApp.capable은 mobile-web-app-capable만 출력하므로,
  // 구형 iOS Safari가 홈 화면 standalone 실행을 인식하도록 레거시 메타를 명시 S
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // 노치/홈 인디케이터 영역까지 채워 standalone 몰입감 확보 S
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      <head>
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
      <body className="min-h-full flex flex-col bg-bg-base text-text-base">
        <ThemeProvider>
          <OnlineUsersProvider>
            <PIPChatProvider>
              <UserSessionManager />
              <AnnouncementBanner />
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <PIPChat />
            </PIPChatProvider>
          </OnlineUsersProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
