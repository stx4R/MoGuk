-- =================================================================
-- 제 2회 오량모의국회 Supabase Schema
-- Supabase SQL Editor에 전체 붙여넣기 후 실행
-- =================================================================


-- -----------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- -----------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------

-- 사용자 프로필 (Supabase Auth 연동)
create table public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  name          text        not null,
  role          text        not null default 'user'
                            check (role in ('admin', 'user')),
  club          text,
  is_banned     boolean     not null default false,
  timeout_until timestamptz,
  created_at    timestamptz not null default now()
);
comment on table public.profiles is '사용자 프로필 및 권한 관리';

-- 실시간 공지
create table public.announcements (
  id         uuid        primary key default gen_random_uuid(),
  content    text        not null,
  author     text        not null,
  admin_id   uuid        references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '120 seconds')
);
comment on table public.announcements is '관리자 실시간 공지 (120초 후 소멸)';

-- 안건
create table public.agenda_items (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  description   text,
  category      text        not null default '법률안'
                            check (category in ('법률안', '결의안', '예산안', '기타')),
  is_open       boolean     not null default false,
  display_order integer     not null default 0,
  opened_at     timestamptz,
  closed_at     timestamptz,
  created_at    timestamptz not null default now()
);
comment on table public.agenda_items is '투표 안건 목록';

-- 투표 — (agenda_id, user_id) UNIQUE로 중복 투표 원천 차단
create table public.votes (
  id         uuid        primary key default gen_random_uuid(),
  agenda_id  uuid        not null references public.agenda_items(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  choice     text        not null check (choice in ('yes', 'no', 'abstain')),
  created_at timestamptz not null default now(),
  constraint votes_agenda_user_unique unique (agenda_id, user_id)
);
comment on table public.votes is '투표 결과 — DB Unique 제약으로 중복 투표 방지';

-- Admin 전용 채팅
create table public.admin_chat (
  id         uuid        primary key default gen_random_uuid(),
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null,
  is_command boolean     not null default false,
  created_at timestamptz not null default now()
);
comment on table public.admin_chat is 'Admin 전용 내부 채팅';

-- Admin 액션 로그
create table public.admin_logs (
  id             uuid        primary key default gen_random_uuid(),
  admin_id       uuid        references public.profiles(id) on delete set null,
  action         text        not null,
  target_user_id uuid        references public.profiles(id) on delete set null,
  detail         text,
  created_at     timestamptz not null default now()
);
comment on table public.admin_logs is '관리자 액션 감사 로그';


-- -----------------------------------------------------------------
-- 2. Trigger — Auth 회원가입 시 profiles 자동 생성
-- -----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- -----------------------------------------------------------------
-- 3. Helper Functions (RLS에서 사용)
-- -----------------------------------------------------------------

-- 현재 로그인 유저가 admin인지 확인
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 현재 로그인 유저가 차단/타임아웃 상태인지 확인
create or replace function public.is_restricted()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        is_banned = true
        or (timeout_until is not null and timeout_until > now())
      )
  );
$$;


-- -----------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- -----------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.announcements enable row level security;
alter table public.agenda_items  enable row level security;
alter table public.votes         enable row level security;
alter table public.admin_chat    enable row level security;
alter table public.admin_logs    enable row level security;

-- profiles
create policy "인증 유저는 모든 프로필 조회 가능"
  on public.profiles for select to authenticated using (true);

create policy "본인 프로필만 수정 가능 (role 변경 불가)"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

create policy "Admin은 모든 프로필 수정 가능"
  on public.profiles for update to authenticated
  using (public.is_admin());

-- announcements
create policy "인증 유저는 공지 조회 가능"
  on public.announcements for select to authenticated using (true);

create policy "Admin만 공지 생성 가능"
  on public.announcements for insert to authenticated
  with check (public.is_admin() and auth.uid() = admin_id);

create policy "Admin만 공지 삭제 가능"
  on public.announcements for delete to authenticated
  using (public.is_admin());

-- agenda_items
create policy "인증 유저는 안건 조회 가능"
  on public.agenda_items for select to authenticated using (true);

create policy "Admin만 안건 관리 가능"
  on public.agenda_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- votes
create policy "인증 유저는 투표 결과 조회 가능"
  on public.votes for select to authenticated using (true);

create policy "본인 투표만 삽입 가능 (open 안건, 미차단 유저)"
  on public.votes for insert to authenticated
  with check (
    auth.uid() = user_id
    and not public.is_restricted()
    and exists (
      select 1 from public.agenda_items
      where id = agenda_id and is_open = true
    )
  );

-- admin_chat
create policy "Admin만 어드민 채팅 조회 가능"
  on public.admin_chat for select to authenticated
  using (public.is_admin());

create policy "Admin만 어드민 채팅 전송 가능"
  on public.admin_chat for insert to authenticated
  with check (public.is_admin() and auth.uid() = author_id);

-- admin_logs
create policy "Admin만 로그 조회 가능"
  on public.admin_logs for select to authenticated
  using (public.is_admin());

create policy "Admin만 로그 생성 가능"
  on public.admin_logs for insert to authenticated
  with check (public.is_admin());


-- -----------------------------------------------------------------
-- 5. RPC Functions (서버 사이드 비즈니스 로직)
-- -----------------------------------------------------------------

-- 투표 제출 — 서버 검증 포함
create or replace function public.submit_vote(
  p_agenda_id uuid,
  p_choice    text
)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id   uuid := auth.uid();
  v_is_open   boolean;
begin
  -- 1. 로그인 확인
  if v_user_id is null then
    return json_build_object('success', false, 'error', '로그인이 필요합니다.');
  end if;

  -- 2. 차단/타임아웃 확인
  if public.is_restricted() then
    return json_build_object('success', false, 'error', '투표 권한이 제한되었습니다.');
  end if;

  -- 3. 안건 공개 여부 확인
  select is_open into v_is_open
  from public.agenda_items where id = p_agenda_id;

  if not found or not v_is_open then
    return json_build_object('success', false, 'error', '투표가 마감되었습니다.');
  end if;

  -- 4. 이미 투표했는지 확인
  if exists (select 1 from public.votes where agenda_id = p_agenda_id and user_id = v_user_id) then
    return json_build_object('success', false, 'error', '이미 투표하셨습니다.');
  end if;

  -- 5. 투표 삽입 (UNIQUE 제약이 동시 요청의 Race Condition도 차단)
  insert into public.votes (agenda_id, user_id, choice)
  values (p_agenda_id, v_user_id, p_choice);

  return json_build_object('success', true);
exception
  when unique_violation then
    return json_build_object('success', false, 'error', '이미 투표하셨습니다.');
  when others then
    return json_build_object('success', false, 'error', '처리 중 오류가 발생했습니다.');
end;
$$;

-- Admin: 안건 열기/닫기
create or replace function public.admin_toggle_agenda(
  p_agenda_id uuid,
  p_open      boolean
)
returns json
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;

  update public.agenda_items
  set
    is_open   = p_open,
    opened_at = case when p_open then now() else opened_at end,
    closed_at = case when not p_open then now() else null end
  where id = p_agenda_id;

  insert into public.admin_logs (admin_id, action, detail)
  values (
    auth.uid(),
    case when p_open then 'agenda_open' else 'agenda_close' end,
    '안건 ID: ' || p_agenda_id::text
  );

  return json_build_object('success', true);
end;
$$;

-- Admin: 유저 강제 로그아웃 로그 기록 (실제 세션 종료는 Service Role로 별도 처리)
create or replace function public.admin_kick_user(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_target_name text;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;

  select name into v_target_name from public.profiles where id = p_user_id;
  if not found then
    return json_build_object('success', false, 'error', '존재하지 않는 유저입니다.');
  end if;

  insert into public.admin_logs (admin_id, action, target_user_id, detail)
  values (auth.uid(), 'kick', p_user_id, v_target_name || ' 강제 로그아웃');

  return json_build_object('success', true, 'target_name', v_target_name);
end;
$$;

-- Admin: 유저 영구 차단
create or replace function public.admin_ban_user(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_target_name text;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;

  select name into v_target_name from public.profiles where id = p_user_id;
  if not found then
    return json_build_object('success', false, 'error', '존재하지 않는 유저입니다.');
  end if;

  update public.profiles set is_banned = true where id = p_user_id;

  insert into public.admin_logs (admin_id, action, target_user_id, detail)
  values (auth.uid(), 'ban', p_user_id, v_target_name || ' 영구 차단');

  return json_build_object('success', true, 'target_name', v_target_name);
end;
$$;

-- Admin: 타임아웃 (초 단위)
create or replace function public.admin_timeout_user(
  p_user_id uuid,
  p_seconds integer
)
returns json
language plpgsql
security definer
as $$
declare
  v_target_name text;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;

  select name into v_target_name from public.profiles where id = p_user_id;
  if not found then
    return json_build_object('success', false, 'error', '존재하지 않는 유저입니다.');
  end if;

  update public.profiles
  set timeout_until = now() + (p_seconds || ' seconds')::interval
  where id = p_user_id;

  insert into public.admin_logs (admin_id, action, target_user_id, detail)
  values (auth.uid(), 'timeout', p_user_id, v_target_name || ' ' || p_seconds || '초 타임아웃');

  return json_build_object('success', true, 'target_name', v_target_name);
end;
$$;


-- -----------------------------------------------------------------
-- 6. Views
-- -----------------------------------------------------------------

-- 안건별 투표 집계 (실시간 카운팅용)
create or replace view public.vote_counts as
select
  agenda_id,
  count(*) filter (where choice = 'yes')     as yes_count,
  count(*) filter (where choice = 'no')      as no_count,
  count(*) filter (where choice = 'abstain') as abstain_count,
  count(*)                                   as total_count
from public.votes
group by agenda_id;

-- 안건 + 투표 집계 조인 뷰
create or replace view public.agenda_with_votes as
select
  a.*,
  coalesce(v.yes_count, 0)     as yes_count,
  coalesce(v.no_count, 0)      as no_count,
  coalesce(v.abstain_count, 0) as abstain_count,
  coalesce(v.total_count, 0)   as total_count
from public.agenda_items a
left join public.vote_counts v on v.agenda_id = a.id
order by a.display_order, a.created_at;


-- -----------------------------------------------------------------
-- 7. Realtime 활성화
-- -----------------------------------------------------------------
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.agenda_items;
alter publication supabase_realtime add table public.admin_chat;
alter publication supabase_realtime add table public.profiles;


-- -----------------------------------------------------------------
-- 8. 초기 데이터 (테스트용 — 실제 운영 전 제거)
-- -----------------------------------------------------------------
insert into public.agenda_items (title, description, category, is_open, display_order)
values
  ('제 1호 안건', '텍스트 1', '법률안', false, 1),
  ('제 2호 안건', '텍스트 2', '결의안', false, 2),
  ('제 3호 안건', '텍스트 3', '법률안', false, 3),
  ('제 4호 안건', '텍스트 4', '예산안', false, 4),
  ('제 5호 안건', '텍스트 5', '결의안', false, 5),
  ('제 6호 안건', '텍스트 6', '법률안', false, 6);
