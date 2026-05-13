// Supabase 연결 상태 확인용 API S
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 1. 환경변수 존재 여부
  if (!url || !key) {
    return NextResponse.json(
      {
        status: 'env_missing',
        NEXT_PUBLIC_SUPABASE_URL: !!url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!key,
      },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });

    // 2. auth 서버 ping (테이블 없어도 됨)
    const { error: authError } = await supabase.auth.getSession();

    // 3. profiles 테이블 존재 여부
    const { error: tableError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    return NextResponse.json({
      status: 'ok',
      supabase_url: url,
      auth: authError ? `error: ${authError.message}` : 'connected',
      profiles_table: tableError
        ? `error: ${tableError.message}`
        : 'exists',
    });
  } catch (e) {
    return NextResponse.json(
      { status: 'exception', error: String(e) },
      { status: 500 }
    );
  }
}
