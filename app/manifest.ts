import type { MetadataRoute } from 'next';

// PWA 매니페스트 — 홈 화면 추가 시 Safari 주소창/버튼 없는 standalone 실행 S
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '제 3회 오량모의국회',
    short_name: '오량모의국회',
    description: '제 3회 오량모의국회 공식 전자투표 플랫폼',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#121212',
    theme_color: '#121212',
    icons: [
      { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
