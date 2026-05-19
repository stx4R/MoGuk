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
  name          text        not null unique,  -- H-3: 이름 중복 가입 방지
  role          text        not null default 'user'
                            check (role in ('admin', 'mod', 'user')),
  pp            text        not null default '무소속'
                            check (pp in ('진보', '보수', '중도', '무소속')),
  club          text,
  is_banned     boolean     not null default false,
  timeout_until timestamptz,
  created_at    timestamptz not null default now()
);
comment on table public.profiles is '사용자 프로필 및 권한 관리';

-- 가입 허용 이름 목록 (운영진 사전 등록, Service Role만 접근 가능)
create table public.allowed_names (
  name text primary key
);
comment on table public.allowed_names is '가입 가능한 사전 승인 이름 목록 — 이 목록에 없는 이름은 회원가입 불가';

alter table public.allowed_names enable row level security;
-- 정책 없음 = Service Role만 접근 가능 (일반 유저 접근 차단)

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
  is_completed  boolean     not null default false,
  display_order integer     not null default 0,
  opened_at     timestamptz,
  closed_at     timestamptz,
  created_at    timestamptz not null default now()
);
comment on table public.agenda_items is '투표 안건 목록 — is_open: 투표 가능 여부, is_completed: 완료(Vote탭 숨김)';

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
  content    text        not null check (char_length(content) <= 2000),
  is_command boolean     not null default false,
  file_url   text,        -- L-3: 파일 첨부 URL
  file_name  text,        -- L-3: 파일 원본 이름
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

-- 채팅방 (C-2: 나중에 추가된 테이블 — RLS 필수)
create table public.chat_rooms (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  icon         text,
  is_public    boolean     not null default false,
  is_support   boolean     not null default false,
  is_global    boolean     not null default false,
  party_tag    text,
  announcement text,
  created_by   uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- 채팅 메시지
create table public.chat_messages (
  id         uuid        primary key default gen_random_uuid(),
  room_id    uuid        not null references public.chat_rooms(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null default '',
  file_url   text,
  file_name  text,
  is_system  boolean     not null default false,
  created_at timestamptz not null default now()
);

-- 채팅방 멤버
create table public.chat_room_members (
  room_id    uuid not null references public.chat_rooms(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- 버그 제보
create table public.bug_reports (
  id          uuid        primary key default gen_random_uuid(),
  reporter_id uuid        references public.profiles(id) on delete set null,
  title       text        not null,
  description text        not null,
  category    text        not null default '기타',
  resolved    boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- 투표 결과 브로드캐스트 (Guest 포함 전체 공개 — anon SELECT 허용) S
create table public.vote_result_broadcasts (
  id            uuid        primary key default gen_random_uuid(),
  agenda_id     uuid        not null references public.agenda_items(id) on delete cascade,
  title         text        not null,
  description   text,
  yes_count     integer     not null default 0,
  no_count      integer     not null default 0,
  abstain_count integer     not null default 0,
  total_voted   integer     not null default 0,
  total_users   integer     not null default 0,
  admin_name    text        not null,
  created_at    timestamptz not null default now()
);
comment on table public.vote_result_broadcasts is '/voteresult 명령어로 생성되는 전체 공개 투표 결과 — 비로그인 포함 전원 수신';

-- 관리자 호출
-- C-3 fix: responder_id 추가 + 'active' 상태 추가 S
create table public.admin_calls (
  id           uuid        primary key default gen_random_uuid(),
  caller_id    uuid        not null references public.profiles(id) on delete cascade,
  responder_id uuid        references public.profiles(id) on delete set null,
  status       text        not null default 'pending' check (status in ('pending', 'active')),
  created_at   timestamptz not null default now()
);


-- -----------------------------------------------------------------
-- 2. Trigger — Auth 회원가입 시 profiles 자동 생성
-- -----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := trim(coalesce(new.raw_user_meta_data->>'name', ''));

  -- P1 fix: Supabase Auth 직접 호출로 /api/auth/signup 우회 시 DB 레벨에서 차단
  -- allowed_names에 없는 이름이면 트랜잭션 전체 롤백 → auth.users 생성도 취소됨
  if not exists (select 1 from public.allowed_names where name = v_name) then
    raise exception 'SIGNUP_NOT_ALLOWED: name not in allowed list';
  end if;

  -- H-2 fix: role은 항상 'user'로 고정 — 메타데이터로 권한 상승 불가 S
  insert into public.profiles (id, name, role)
  values (new.id, v_name, 'user');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- PP 변경 시 정당 채팅방 멤버십 자동 교체 S
create or replace function public.handle_pp_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.pp is distinct from new.pp then
    -- 기존 정당 채팅방 나가기
    if old.pp is not null and old.pp != '무소속' then
      delete from public.chat_room_members
      where user_id = new.id
        and room_id in (select id from public.chat_rooms where party_tag = old.pp);
    end if;
    -- 새 정당 채팅방 가입
    if new.pp is not null and new.pp != '무소속' then
      insert into public.chat_room_members (room_id, user_id)
      select id, new.id from public.chat_rooms where party_tag = new.pp
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger on_pp_change
  after update of pp on public.profiles
  for each row execute function public.handle_pp_change();


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

-- 현재 로그인 유저가 admin 또는 mod인지 확인
create or replace function public.is_mod_or_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'mod')
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


-- 무한 재귀 방지: RLS 없이 멤버십 확인 (SECURITY DEFINER) S
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.chat_room_members
    where room_id = p_room_id and user_id = auth.uid()
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

-- admin_chat (Admin + Mod 접근 가능)
create policy "Admin/Mod 어드민 채팅 조회 가능"
  on public.admin_chat for select to authenticated
  using (public.is_mod_or_admin());

-- H-3: is_command = true 는 Admin만 삽입 가능 S
create policy "Admin/Mod 어드민 채팅 전송 가능"
  on public.admin_chat for insert to authenticated
  with check (
    public.is_mod_or_admin()
    and auth.uid() = author_id
    and (is_command = false or public.is_admin())
  );

-- admin_logs (Admin + Mod 조회, 생성은 Admin만)
create policy "Admin/Mod 로그 조회 가능"
  on public.admin_logs for select to authenticated
  using (public.is_mod_or_admin());

-- C-4: admin_id가 반드시 호출자 본인이어야 함 — 타 Admin 명의 허위 로그 삽입 방지 S
create policy "Admin만 로그 생성 가능"
  on public.admin_logs for insert to authenticated
  with check (public.is_admin() and auth.uid() = admin_id);

-- C-2: 나중에 추가된 테이블 RLS 활성화 및 정책
alter table public.chat_rooms        enable row level security;
alter table public.chat_messages     enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.bug_reports       enable row level security;
alter table public.admin_calls       enable row level security;

-- chat_rooms — is_room_member() SECURITY DEFINER로 재귀 방지 S
create policy "공개 채팅방 또는 멤버만 조회 가능"
  on public.chat_rooms for select to authenticated
  using (
    is_public = true
    or auth.uid() = created_by
    or public.is_room_member(id)
  );

create policy "인증 사용자가 일반 채팅방 생성 가능"
  on public.chat_rooms for insert to authenticated
  with check (not public.is_restricted() and is_global = false and party_tag is null);

-- H-3 fix: 개설자 또는 Admin만 채팅방 수정 가능 (클라이언트 isCreator 체크 우회 방어) S
create policy "개설자 또는 Admin만 채팅방 수정 가능"
  on public.chat_rooms for update to authenticated
  using (auth.uid() = created_by or public.is_admin());

-- L-11: Mod도 is_support 방 삭제 가능 S
create policy "개설자 또는 Admin만 채팅방 삭제 가능"
  on public.chat_rooms for delete to authenticated
  using (auth.uid() = created_by or public.is_admin() or (public.is_mod_or_admin() and is_support = true));

-- chat_messages — JOIN 방식 재귀 제거, is_room_member() 사용 S
create policy "방 멤버는 메시지 조회 가능"
  on public.chat_messages for select to authenticated
  using (
    public.is_room_member(room_id)
    or exists (select 1 from public.chat_rooms where id = room_id and is_public = true)
  );

-- NH-3: is_system은 Admin/Mod만 설정 가능, L-10: Rate Limit 추가 S
create policy "방 멤버이고 미차단 상태면 메시지 전송 가능"
  on public.chat_messages for insert to authenticated
  with check (
    auth.uid() = author_id
    and not public.is_restricted()
    and (is_system = false or public.is_mod_or_admin())
    and public.check_chat_rate_limit()
    and exists (select 1 from public.chat_room_members where room_id = chat_messages.room_id and user_id = auth.uid())
    and (
      not exists (select 1 from public.chat_rooms where id = room_id and is_global = true)
      or public.is_admin()
    )
  );

-- chat_room_members — 자기 참조 제거, SECURITY DEFINER 함수 사용 S
create policy "방 멤버 또는 공개방이면 멤버 목록 조회 가능"
  on public.chat_room_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_room_member(room_id)
  );

create policy "본인 가입만 허용"
  on public.chat_room_members for insert to authenticated
  with check (auth.uid() = user_id and not public.is_restricted());

create policy "본인 탈퇴 또는 개설자/Admin이 멤버 제거 가능"
  on public.chat_room_members for delete to authenticated
  using (
    auth.uid() = user_id
    or public.is_admin()
    or exists (select 1 from public.chat_rooms where id = room_id and created_by = auth.uid())
  );

-- bug_reports
create policy "Admin/Mod는 버그 제보 조회 가능"
  on public.bug_reports for select to authenticated
  using (public.is_mod_or_admin());

-- H-5: 서버 측 Rate Limit — 5분 내 3회 초과 시 거부 S
create or replace function public.check_bug_report_rate_limit()
returns boolean
language sql
security definer
as $$
  select count(*) < 3
  from public.bug_reports
  where reporter_id = auth.uid()
    and created_at > now() - interval '5 minutes';
$$;

create policy "로그인 사용자 버그 제보 (Rate Limit 적용)"
  on public.bug_reports for insert to authenticated
  with check (public.check_bug_report_rate_limit());

-- L-10: 채팅 메시지 Rate Limit — 1분에 30개 초과 차단 S
create or replace function public.check_chat_rate_limit()
returns boolean
language sql
security definer
as $$
  select count(*) < 30
  from public.chat_messages
  where author_id = auth.uid()
    and created_at > now() - interval '1 minute';
$$;

create policy "비로그인 게스트 버그 제보 허용"
  on public.bug_reports for insert to anon
  with check (reporter_id is null);

-- C-3 fix: Admin만 버그 제보 수정 가능 (클라이언트 UI 우회 방어) S
create policy "Admin만 버그 제보 수정 가능"
  on public.bug_reports for update to authenticated
  using (public.is_admin());

create policy "Admin만 버그 제보 삭제 가능"
  on public.bug_reports for delete to authenticated
  using (public.is_admin());

-- vote_result_broadcasts (비로그인 포함 전원 조회, Admin만 삽입)
alter table public.vote_result_broadcasts enable row level security;

create policy "모든 사용자 투표 결과 조회 가능"
  on public.vote_result_broadcasts for select to anon, authenticated using (true);

create policy "Admin만 투표 결과 브로드캐스트 가능"
  on public.vote_result_broadcasts for insert to authenticated
  with check (public.is_admin());

-- admin_calls
create policy "Admin/Mod 또는 본인이 호출 조회 가능"
  on public.admin_calls for select to authenticated
  using (public.is_mod_or_admin() or auth.uid() = caller_id);

create policy "인증 사용자가 관리자 호출 가능"
  on public.admin_calls for insert to authenticated
  with check (auth.uid() = caller_id and not public.is_restricted());

-- C-3: Admin/Mod가 호출 상태를 active로 변경 가능 S
create policy "Admin/Mod가 호출 수락 가능"
  on public.admin_calls for update to authenticated
  using (public.is_mod_or_admin())
  with check (public.is_mod_or_admin());

create policy "Admin/Mod 또는 본인이 호출 취소 가능"
  on public.admin_calls for delete to authenticated
  using (public.is_mod_or_admin() or auth.uid() = caller_id);

-- NH-2: 사용자당 pending 호출 1개 제한 S
create unique index if not exists admin_calls_one_pending_per_user
  on public.admin_calls (caller_id)
  where status = 'pending';


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

-- Admin: 안건 생성 (자동 공지 포함) S
create or replace function public.admin_create_agenda(
  p_title       text,
  p_description text
)
returns json
language plpgsql
security definer
as $$
declare
  v_new_id       uuid;
  v_display_order integer;
  v_admin_name   text;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;

  select coalesce(max(display_order), 0) + 1 into v_display_order from public.agenda_items;
  select name into v_admin_name from public.profiles where id = auth.uid();

  insert into public.agenda_items (title, description, is_open, is_completed, display_order)
  values (p_title, p_description, false, false, v_display_order)
  returning id into v_new_id;

  insert into public.admin_logs (admin_id, action, detail)
  values (auth.uid(), 'agenda_create', '"' || p_title || '" 투표 생성');

  -- 생성 자동 공지
  insert into public.announcements (content, author, admin_id)
  values ('"' || p_title || '" 투표가 생성되었습니다.', v_admin_name, auth.uid());

  return json_build_object('success', true, 'id', v_new_id);
end;
$$;

-- Admin: 안건 열기/닫기 (자동 공지 포함, 완료된 안건 차단) S
create or replace function public.admin_toggle_agenda(
  p_agenda_id uuid,
  p_open      boolean
)
returns json
language plpgsql
security definer
as $$
declare
  v_title        text;
  v_is_completed boolean;
  v_admin_name   text;
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

  select name into v_admin_name from public.profiles where id = auth.uid();

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
    '"' || v_title || '"' || case when p_open then ' 투표 열기' else ' 투표 닫기' end
  );

  -- 열기/닫기 자동 공지
  insert into public.announcements (content, author, admin_id)
  values (
    '"' || v_title || '" ' || case when p_open then '투표가 가능합니다.' else '투표가 일시 중단되었습니다.' end,
    v_admin_name,
    auth.uid()
  );

  return json_build_object('success', true);
end;
$$;

-- Admin: 안건 투표 완료 처리 (데이터 잠금 + Vote탭 숨김 + 자동 공지) S
create or replace function public.admin_complete_agenda(p_agenda_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_title      text;
  v_admin_name text;
begin
  if not public.is_admin() then
    return json_build_object('success', false, 'error', '권한이 없습니다.');
  end if;

  select title into v_title from public.agenda_items where id = p_agenda_id;

  if not found then
    return json_build_object('success', false, 'error', '안건을 찾을 수 없습니다.');
  end if;

  select name into v_admin_name from public.profiles where id = auth.uid();

  update public.agenda_items
  set is_open = false, is_completed = true, closed_at = now()
  where id = p_agenda_id;

  insert into public.admin_logs (admin_id, action, detail)
  values (auth.uid(), 'agenda_complete', '"' || v_title || '" 투표 완료');

  -- 완료 자동 공지
  insert into public.announcements (content, author, admin_id)
  values ('"' || v_title || '" 투표가 완료되었습니다.', v_admin_name, auth.uid());

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

  -- H-1(v4): Admin 계정은 kick 대상에서 제외 S
  if (select role from public.profiles where id = p_user_id) = 'admin' then
    return json_build_object('success', false, 'error', '다른 관리자를 강제 로그아웃할 수 없습니다.');
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

  -- H-1(v4): Admin 계정은 ban 대상에서 제외 S
  if (select role from public.profiles where id = p_user_id) = 'admin' then
    return json_build_object('success', false, 'error', '다른 관리자를 차단할 수 없습니다.');
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

  -- H-1(v4): Admin 계정은 timeout 대상에서 제외 S
  if (select role from public.profiles where id = p_user_id) = 'admin' then
    return json_build_object('success', false, 'error', '다른 관리자를 타임아웃할 수 없습니다.');
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

-- 안건 + 투표 집계 조인 뷰 (컬럼 명시 — a.* 사용 시 뷰 재생성 충돌 방지) S
create view public.agenda_with_votes as
select
  a.id,
  a.title,
  a.description,
  a.category,
  a.is_open,
  a.is_completed,
  a.display_order,
  a.opened_at,
  a.closed_at,
  a.created_at,
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
-- L-1: 신규 테이블 Realtime 활성화 S
alter publication supabase_realtime add table public.chat_rooms;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_room_members;
alter publication supabase_realtime add table public.admin_calls;
-- 투표 결과 브로드캐스트 Realtime (Guest 포함 전체 수신) S
alter publication supabase_realtime add table public.vote_result_broadcasts;


-- -----------------------------------------------------------------
-- 8. Migration — 기존 DB에 적용할 SQL (Supabase SQL Editor에서 실행)
-- -----------------------------------------------------------------
-- (아래 블록을 기존 DB에서 실행하세요. 신규 설치는 1번부터 전체 실행)
--
-- Step 1: agenda_items에 is_completed 컬럼 추가
-- alter table public.agenda_items add column if not exists is_completed boolean not null default false;
--
-- Step 2: agenda_with_votes 뷰 재생성 (is_completed 포함)
-- create or replace view public.agenda_with_votes as
-- select
--   a.*,
--   coalesce(v.yes_count, 0)     as yes_count,
--   coalesce(v.no_count, 0)      as no_count,
--   coalesce(v.abstain_count, 0) as abstain_count,
--   coalesce(v.total_count, 0)   as total_count
-- from public.agenda_items a
-- left join public.vote_counts v on v.agenda_id = a.id
-- order by a.display_order, a.created_at;
--
-- Step 3: vote_result_broadcasts 테이블 생성
-- (위 1번 테이블 생성 SQL 그대로 실행)
--
-- Step 4: vote_result_broadcasts RLS 정책 추가
-- (위 RLS 섹션의 vote_result_broadcasts 정책 SQL 그대로 실행)
--
-- Step 5: 신규 RPC 함수 등록
-- (admin_create_agenda, admin_toggle_agenda 업데이트, admin_complete_agenda 함수 SQL 그대로 실행)
--
-- Step 6: Realtime 활성화
-- alter publication supabase_realtime add table public.vote_result_broadcasts;
--
-- ── 특수방 + /promote + PP 변경 마이그레이션 ─────────────────────────────────
--
-- Step 7: PP 변경 트리거 등록 (신규 설치는 스킵, 기존 DB에만 실행)
-- (위 2번 섹션의 handle_pp_change 함수 + on_pp_change 트리거 SQL 그대로 실행)
--
-- ── L-10/L-11: 채팅 Rate Limit + Mod 권한 마이그레이션 ─────────────────────────
--
-- Step 8: chat_messages Rate Limit 함수 등록
-- (위 check_chat_rate_limit 함수 SQL 그대로 실행)
--
-- Step 9: chat_messages INSERT 정책 재생성 (Rate Limit + is_mod_or_admin)
-- drop policy if exists "방 멤버이고 미차단 상태면 메시지 전송 가능" on public.chat_messages;
-- (위 chat_messages INSERT 정책 SQL 그대로 실행)
--
-- Step 10: chat_rooms DELETE 정책 재생성 (Mod + is_support)
-- drop policy if exists "개설자 또는 Admin만 채팅방 삭제 가능" on public.chat_rooms;
-- (위 chat_rooms DELETE 정책 SQL 그대로 실행)

-- -----------------------------------------------------------------
-- 9. 초기 데이터 (테스트용 — 실제 운영 전 제거)
-- -----------------------------------------------------------------
insert into public.agenda_items (title, description, category, is_open, display_order)
values
  ('제 1호 안건', '텍스트 1', '법률안', false, 1),
  ('제 2호 안건', '텍스트 2', '결의안', false, 2),
  ('제 3호 안건', '텍스트 3', '법률안', false, 3),
  ('제 4호 안건', '텍스트 4', '예산안', false, 4),
  ('제 5호 안건', '텍스트 5', '결의안', false, 5),
  ('제 6호 안건', '텍스트 6', '법률안', false, 6);
