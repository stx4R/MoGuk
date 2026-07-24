import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/vote'];

// 서비스 종료 (운영정책 제 2조 - 다 항). 서비스를 다시 열려면 false 로 변경하세요.
const SERVICE_CLOSED = true;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SERVICE_CLOSED) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Service has been permanently shut down.' },
        { status: 410, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    const closedUrl = request.nextUrl.clone();
    closedUrl.pathname = '/closed';
    closedUrl.search = '';

    const closed = NextResponse.rewrite(closedUrl);
    closed.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return closed;
  }

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

  const needsAuth = PROTECTED_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + '/')
  );
  if (needsAuth && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)',
  ],
};
