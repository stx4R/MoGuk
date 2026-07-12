-- ============================================================
-- 오량모의국회 보안 패치 (Phase 4)
-- V-1: 투표 원본 열람 제한 (비밀투표 보호)
-- V-4: 결과 공개를 서버 집계 RPC로 이전 (무결성)
-- Supabase SQL Editor에서 실행. phase1_cleanup.sql 이후에 실행 권장.
-- ============================================================

-- V-1) votes SELECT: 전체 공개 → 본인 + Admin만
--      (투표 페이지는 본인 투표만 조회, 집계는 아래 RPC가 SECURITY DEFINER로 수행)
drop policy if exists "인증 유저는 투표 결과 조회 가능" on public.votes;

create policy "본인 투표 또는 Admin만 조회 가능"
  on public.votes for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- V-4) 결과 공개 RPC — 서버가 votes를 직접 집계하여 broadcast 생성
--      클라이언트 계산값을 신뢰하지 않음.
create or replace function public.admin_publish_result(p_agenda_id uuid)
returns json language plpgsql security definer as $$
declare
  v_title       text;
  v_description text;
  v_yes         integer;
  v_no          integer;
  v_abstain     integer;
  v_total_voted integer;
  v_total_users integer;
  v_admin_name  text;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;

  select title, description into v_title, v_description
  from public.agenda_items where id = p_agenda_id;
  if not found then
    return json_build_object('success', false, 'error', '안건을 찾을 수 없습니다.');
  end if;

  select
    count(*) filter (where choice = 'yes'),
    count(*) filter (where choice = 'no'),
    count(*) filter (where choice = 'abstain'),
    count(*)
  into v_yes, v_no, v_abstain, v_total_voted
  from public.votes where agenda_id = p_agenda_id;

  select count(*) into v_total_users from public.profiles;
  select name into v_admin_name from public.profiles where id = auth.uid();

  insert into public.vote_result_broadcasts
    (agenda_id, title, description, yes_count, no_count, abstain_count, total_voted, total_users, admin_name)
  values
    (p_agenda_id, v_title, v_description, v_yes, v_no, v_abstain, v_total_voted, v_total_users, v_admin_name);

  return json_build_object('success', true);
end;
$$;

-- 참고(코드 외 조치):
-- V-2: Supabase Auth > Providers > Email 에서 "Allow new users to sign up" 비활성화.
--      가입은 Service Role(/api/auth/signup, OTP 검증) 경로만 허용.
-- V-5: Storage 'chat-files' 버킷 삭제 또는 authenticated 전용으로 정책 변경.
