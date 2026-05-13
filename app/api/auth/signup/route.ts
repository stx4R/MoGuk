// 사전 승인된 이름만 가입 허용 — Service Role로 서버 검증 S
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
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

  // 3. 이미 가입된 이메일인지 확인 (createUser 에러보다 먼저 명시적으로 차단)
  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailTaken = existingUsers?.users?.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (emailTaken) {
    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 });
  }

  // 4. 계정 생성 (이메일 인증 즉시 완료 처리)
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
