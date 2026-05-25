// Supabase 연결 상태 확인용 API — 내부 인프라 정보 비노출 S
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ status: 'env_missing' }, { status: 500 });
  }

  // L-9 fix: HEALTH_SECRET 설정 시 일치하지 않으면 상세 정보 비공개
  const secret = process.env.HEALTH_SECRET;
  if (secret) {
    const provided = request.headers.get('x-health-secret');
    if (provided !== secret) {
      return NextResponse.json({ status: 'ok' });
    }
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });

    const { error: authError } = await supabase.auth.getSession();
    const { error: tableError } = await supabase.from('profiles').select('id').limit(1);

    // M-4 fix: supabase_url 등 내부 정보 제거 S
    return NextResponse.json({
      status: 'ok',
      auth:           authError  ? 'error' : 'connected',
      profiles_table: tableError ? 'error' : 'exists',
    });
  } catch {
    return NextResponse.json({ status: 'exception' }, { status: 500 });
  }
}
