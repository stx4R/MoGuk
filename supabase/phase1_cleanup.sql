-- ============================================================
-- 오량모의국회 Phase 1 정리 마이그레이션
-- Announcements / 버그제보 / 채팅(스태프 포함) / 지원호출 기능 DB 제거
-- Supabase SQL Editor에 전체 붙여넣고 실행.
-- 모든 구문이 idempotent(if exists / create or replace) — 재실행 안전.
-- 주의: 행사 기간 중이면 점검 시간에 실행하고, 실행 전 백업 권장.
-- ============================================================

-- 1) 안건 관리 RPC 재정의 — announcements 자동 삽입 제거
--    (announcements 테이블을 드롭해도 투표 생성/열기/완료가 깨지지 않도록)
create or replace function public.admin_create_agenda(p_title text, p_description text)
returns json language plpgsql security definer as $$
declare
  v_new_id uuid;
  v_display_order integer;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;
  select coalesce(max(display_order), 0) + 1 into v_display_order from public.agenda_items;
  insert into public.agenda_items (title, description, is_open, is_completed, display_order)
  values (p_title, p_description, false, false, v_display_order)
  returning id into v_new_id;
  insert into public.admin_logs (admin_id, action, detail)
  values (auth.uid(), 'agenda_create', '"' || p_title || '" 투표 생성');
  return json_build_object('success', true, 'id', v_new_id);
end;
$$;

create or replace function public.admin_toggle_agenda(p_agenda_id uuid, p_open boolean)
returns json language plpgsql security definer as $$
declare
  v_title text;
  v_is_completed boolean;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;
  select title, is_completed into v_title, v_is_completed
  from public.agenda_items where id = p_agenda_id;
  if not found then
    return json_build_object('success', false, 'error', '안건을 찾을 수 없습니다.');
  end if;
  if v_is_completed then
    return json_build_object('success', false, 'error', '완료된 투표는 변경할 수 없습니다.');
  end if;
  update public.agenda_items
  set is_open   = p_open,
      opened_at = case when p_open then now() else opened_at end,
      closed_at = case when not p_open then now() else null end
  where id = p_agenda_id;
  insert into public.admin_logs (admin_id, action, detail)
  values (auth.uid(),
    case when p_open then 'agenda_open' else 'agenda_close' end,
    '"' || v_title || '"' || case when p_open then ' 투표 열기' else ' 투표 닫기' end);
  return json_build_object('success', true);
end;
$$;

create or replace function public.admin_complete_agenda(p_agenda_id uuid)
returns json language plpgsql security definer as $$
declare
  v_title text;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;
  select title into v_title from public.agenda_items where id = p_agenda_id;
  if not found then
    return json_build_object('success', false, 'error', '안건을 찾을 수 없습니다.');
  end if;
  update public.agenda_items
  set is_open = false, is_completed = true, closed_at = now()
  where id = p_agenda_id;
  insert into public.admin_logs (admin_id, action, detail)
  values (auth.uid(), 'agenda_complete', '"' || v_title || '" 투표 완료');
  return json_build_object('success', true);
end;
$$;

-- 2) PP 변경 트리거 + plpgsql 함수 제거 (정책 의존성 없음 — 먼저 제거 가능)
drop trigger  if exists on_pp_change on public.profiles;
drop function if exists public.handle_pp_change();

-- 3) 테이블 삭제 (CASCADE) — RLS 정책, 인덱스, publication 멤버십,
--    그리고 이 테이블들에 의존하는 SQL 헬퍼 함수까지 함께 제거됨.
--    (함수를 테이블보다 먼저 드롭하면 정책 의존성 때문에 실패하므로 테이블을 먼저 드롭)
drop table if exists public.chat_messages     cascade;
drop table if exists public.chat_room_members cascade;
drop table if exists public.chat_rooms        cascade;
drop table if exists public.admin_calls       cascade;
drop table if exists public.admin_chat        cascade;
drop table if exists public.bug_reports       cascade;
drop table if exists public.announcements     cascade;

-- 4) 남아있을 수 있는 SQL 헬퍼 함수 정리 (3번 CASCADE로 이미 제거됐으면 no-op)
drop function if exists public.is_room_member(uuid);
drop function if exists public.is_global_room(uuid);
drop function if exists public.can_self_join_room(uuid);
drop function if exists public.check_chat_rate_limit();
drop function if exists public.check_bug_report_rate_limit();

-- 5) (대시보드에서 별도 수행) Storage 버킷 'chat-files' 삭제 또는 authenticated 전용으로 잠금.
--    채팅 삭제로 더 이상 사용되지 않음.
