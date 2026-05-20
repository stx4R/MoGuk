-- profiles 삭제 시 FK 제약 오류 수정 — ON DELETE 동작 재설정 S
-- Supabase SQL 에디터에서 전체 실행하세요.

-- ── admin_calls ──────────────────────────────────────────────────────
alter table public.admin_calls
  drop constraint if exists admin_calls_caller_id_fkey;
alter table public.admin_calls
  add constraint admin_calls_caller_id_fkey
  foreign key (caller_id) references public.profiles(id) on delete cascade;

alter table public.admin_calls
  drop constraint if exists admin_calls_responder_id_fkey;
alter table public.admin_calls
  add constraint admin_calls_responder_id_fkey
  foreign key (responder_id) references public.profiles(id) on delete set null;

-- ── admin_logs ───────────────────────────────────────────────────────
alter table public.admin_logs
  drop constraint if exists admin_logs_admin_id_fkey;
alter table public.admin_logs
  add constraint admin_logs_admin_id_fkey
  foreign key (admin_id) references public.profiles(id) on delete set null;

alter table public.admin_logs
  drop constraint if exists admin_logs_target_user_id_fkey;
alter table public.admin_logs
  add constraint admin_logs_target_user_id_fkey
  foreign key (target_user_id) references public.profiles(id) on delete set null;

-- ── admin_chat ───────────────────────────────────────────────────────
alter table public.admin_chat
  drop constraint if exists admin_chat_author_id_fkey;
alter table public.admin_chat
  add constraint admin_chat_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete cascade;

-- ── chat_rooms ───────────────────────────────────────────────────────
alter table public.chat_rooms
  drop constraint if exists chat_rooms_created_by_fkey;
alter table public.chat_rooms
  add constraint chat_rooms_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- ── chat_messages ────────────────────────────────────────────────────
alter table public.chat_messages
  drop constraint if exists chat_messages_author_id_fkey;
alter table public.chat_messages
  add constraint chat_messages_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete cascade;

-- ── chat_room_members ────────────────────────────────────────────────
alter table public.chat_room_members
  drop constraint if exists chat_room_members_user_id_fkey;
alter table public.chat_room_members
  add constraint chat_room_members_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ── votes ────────────────────────────────────────────────────────────
alter table public.votes
  drop constraint if exists votes_user_id_fkey;
alter table public.votes
  add constraint votes_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ── bug_reports ──────────────────────────────────────────────────────
alter table public.bug_reports
  drop constraint if exists bug_reports_reporter_id_fkey;
alter table public.bug_reports
  add constraint bug_reports_reporter_id_fkey
  foreign key (reporter_id) references public.profiles(id) on delete set null;

-- ── timeouts (존재하는 경우) ─────────────────────────────────────────
alter table public.timeouts
  drop constraint if exists timeouts_user_id_fkey;
alter table public.timeouts
  add constraint timeouts_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
