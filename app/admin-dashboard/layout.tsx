import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '관리 페이지',
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
