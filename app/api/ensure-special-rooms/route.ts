// 특수방(전체 공지방·정당 채팅방) 없으면 service key로 자동 생성 S
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const SPECIAL_ROOMS = [
  { key: 'global', name: '전체 공지방',      icon: '📢', is_global: true,  party_tag: null   },
  { key: '진보',   name: '진보 전체 채팅방', icon: '🔵', is_global: false, party_tag: '진보' },
  { key: '보수',   name: '보수 전체 채팅방', icon: '🔴', is_global: false, party_tag: '보수' },
  { key: '중도',   name: '중도 전체 채팅방', icon: '🟡', is_global: false, party_tag: '중도' },
];

export async function POST() {
  // H-3 fix: 비인증 요청 차단 — Admin만 호출 가능
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 });
  }
  const { data: profile } = await userClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const result: { globalRoomId: string | null; partyRoomIds: Record<string, string> } = {
    globalRoomId: null,
    partyRoomIds: {},
  };

  for (const spec of SPECIAL_ROOMS) {
    const query = spec.is_global
      ? supabase.from('chat_rooms').select('id').eq('is_global', true)
      : supabase.from('chat_rooms').select('id').eq('party_tag', spec.party_tag!);

    const { data: existing } = await query.maybeSingle();
    let roomId: string | null = existing?.id ?? null;

    if (!roomId) {
      const { data: created } = await supabase.from('chat_rooms').insert({
        name:      spec.name,
        icon:      spec.icon,
        is_public: false,
        is_global: spec.is_global,
        party_tag: spec.party_tag,
      }).select('id').single();
      roomId = created?.id ?? null;
    }

    if (roomId) {
      if (spec.is_global) result.globalRoomId = roomId;
      else result.partyRoomIds[spec.key] = roomId;
    }
  }

  return NextResponse.json(result);
}
