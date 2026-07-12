import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkOrigin } from '@/lib/csrf';

export async function POST(request: Request) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: '잘못된 요청 출처' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const { targetUserId } = await request.json() as { targetUserId: string };

  if (!targetUserId) {
    return NextResponse.json({ error: '대상 유저 ID 필요' }, { status: 400 });
  }

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single();

  if (targetProfile?.role === 'admin') {
    return NextResponse.json({ error: '다른 관리자를 강제 로그아웃할 수 없습니다.' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { error } = await admin.auth.admin.signOut(targetUserId, 'global');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
