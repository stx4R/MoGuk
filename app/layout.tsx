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
            </PIPChatProvider>
          </OnlineUsersProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
