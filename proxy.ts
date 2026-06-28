// 라우트 보호 프록시 — Admin/Mod 전용 + 비로그인 차단 S
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/about', '/login', '/signup', '/help', '/terms', '/privacy', '/operation'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) return NextResponse.next({ request });
  if (pathname.startsWith('/clubs/')) return NextResponse.next({ request });

  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request 쿠키도 갱신해야 토큰 갱신 시 하위 컴포넌트에서도 새 토큰을 볼 수 있음 S
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin-Dashboard: admin 또는 mod만 접근 가능
  if (pathname.startsWith('/admin-dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'mod'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
  }

  // 공개 라우트 외 전체 페이지 — 로그인 필수 (redirectTo로 복귀 경로 전달) S
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  if (!isPublic && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // 확장자가 있는 정적 파일(폰트·로고·아이콘·manifest 등)은 프록시를 거치지 않도록 제외 —
    // 비로그인 방문자에게 정적 자원이 /login으로 리다이렉트되던 문제 방지 S
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
