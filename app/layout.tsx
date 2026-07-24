import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { OnlineUsersProvider } from '@/components/providers/OnlineUsersContext';
// 서비스 종료: Supabase 실시간 연결 중단 (복구 시 아래 import 와 사용처 주석 해제)
// import UserSessionManager from '@/components/providers/UserSessionManager';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

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
    statusBarStyle: 'black',
  },
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
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      <head>
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
      <body className="min-h-full md:[@media(min-height:700px)]:h-dvh md:[@media(min-height:700px)]:overflow-hidden flex flex-col bg-bg-base text-text-base pt-[env(safe-area-inset-top)]">
        <div aria-hidden className="fixed inset-x-0 top-0 z-[9999] h-[env(safe-area-inset-top)] bg-bg-base" />
        <ThemeProvider>
          <OnlineUsersProvider>
            {/* <UserSessionManager /> */}
            <Header />
            <main className="flex-1 md:[@media(min-height:700px)]:min-h-0 flex">{children}</main>
            <Footer />
          </OnlineUsersProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
