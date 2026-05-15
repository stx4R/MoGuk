// 사전 승인된 이름만 가입 허용 — Service Role로 서버 검증 S
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// M-1 fix: IP별 간단 rate limiting (서버리스 단일 인스턴스 내 best-effort) S
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT     = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  // Rate limit check
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const body = await request.json() as { email?: string; password?: string; name?: string };
  const { email, password, name } = body;

  if (!email || !password || !name) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. 사전 승인 이름 목록 확인
  const { data: allowed } = await admin
    .from('allowed_names')
    .select('name')
    .eq('name', name)
    .single();

  if (!allowed) {
    return NextResponse.json(
      { error: '사전 등록된 이름이 아닙니다. 운영진에게 문의하세요.' },
      { status: 403 }
    );
  }

  // 2. 이미 가입된 이름인지 확인
  const { data: takenName } = await admin
    .from('profiles')
    .select('id')
    .eq('name', allowed.name)
    .single();

  if (takenName) {
    return NextResponse.json({ error: '이미 사용 중인 이름입니다.' }, { status: 409 });
  }

  // 3. 계정 생성 — createUser가 이메일 중복을 에러로 반환하므로 listUsers() 불필요 S
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: allowed.name },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
    }
    return NextResponse.json({ error: '계정 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
