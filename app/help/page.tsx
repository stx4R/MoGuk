'use client';

// Help 페이지 — 관리자 호출 + 버그 제보 (비로그인 게스트 접근 허용) S
import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, CheckCircle2, Bug, Send, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePIPChat } from '@/components/providers/PIPChatContext';
import { cn } from '@/utils/cn';

type CallStatus = 'idle' | 'waiting' | 'connected';

const BUG_CATEGORIES = ['UI/디자인', '기능 오류', '성능', '접근 불가', '기타'];

export default function HelpPage() {
  const supabase = useRef(createClient()).current;
  const { setPipRoomId } = usePIPChat();

  const [myId, setMyId]               = useState<string | null>(null);
  const [myName, setMyName]           = useState('');
  const [callStatus, setCallStatus]   = useState<CallStatus>('idle');
  const [callId, setCallId]           = useState<string | null>(null);

  const [bugTitle, setBugTitle]       = useState('');
  const [bugDesc, setBugDesc]         = useState('');
  const [bugCategory, setBugCategory] = useState(BUG_CATEGORIES[0]);
  const [bugSending, setBugSending]   = useState(false);
  const [bugSent, setBugSent]         = useState(false);

  const signalChRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── 초기화 ────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMyName('Guest');
        return;
      }
      setMyId(user.id);

      const { data: prof } = await supabase
        .from('profiles').select('name').eq('id', user.id).single();
      if (prof) setMyName(prof.name);

      // 지원 연결 신호 수신 채널
      signalChRef.current = supabase.channel(`support-signal:${user.id}`)
        .on('broadcast', { event: 'support_ready' }, ({ payload }: { payload: { room_id: string } }) => {
          setCallStatus('connected');
          setPipRoomId(payload.room_id);
        })
        .subscribe();
    }

    init();
    return () => {
      if (signalChRef.current) supabase.removeChannel(signalChRef.current);
    };
  }, [supabase, setPipRoomId]);

  // ── 관리자 호출 ───────────────────────────────────────────────────
  const handleCall = async () => {
    if (callStatus !== 'idle') return;
    if (!myId) {
      alert('관리자 호출을 이용하려면 로그인이 필요합니다.');
      return;
    }
    setCallStatus('waiting');

    const { data } = await supabase
      .from('admin_calls')
      .insert({ caller_id: myId, status: 'pending' })
      .select('id')
      .single();

    if (data) setCallId(data.id);
  };

  const handleCancelCall = async () => {
    if (callId) {
      await supabase.from('admin_calls').delete().eq('id', callId).eq('status', 'pending');
      setCallId(null);
    }
    setCallStatus('idle');
  };

  // ── 버그 제보 ─────────────────────────────────────────────────────
  const handleBugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDesc.trim() || bugSending) return;
    setBugSending(true);

    await supabase.from('bug_reports').insert({
      reporter_id: myId,
      title: bugTitle.trim(),
      description: bugDesc.trim(),
      category: bugCategory,
    });

    setBugSent(true);
    setBugTitle('');
    setBugDesc('');
    setBugCategory(BUG_CATEGORIES[0]);
    setBugSending(false);

    setTimeout(() => setBugSent(false), 4000);
  };

  // ── 렌더 ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">도움말</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">관리자에게 문의하거나 버그를 제보하세요.</p>
      </div>

      {/* ── 관리자 호출 섹션 ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex items-center gap-2">
          <Phone size={15} className="text-red-primary dark:text-yellow-primary" />
          <span className="font-bold text-gray-800 dark:text-white text-sm">관리자 호출</span>
        </div>
        <div className="p-6 flex flex-col items-center gap-5 text-center">
          {callStatus === 'idle' && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                문제가 있으신가요? 버튼을 눌러 온라인 관리자를 호출하세요.<br />
                관리자가 수락하면 채팅 창이 자동으로 열립니다.
              </p>
              <button
                onClick={handleCall}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 font-semibold text-sm hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors"
              >
                <Phone size={16} />
                관리자 호출하기
              </button>
            </>
          )}

          {callStatus === 'waiting' && (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full border-4 border-yellow-primary/30 border-t-yellow-primary animate-spin" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">관리자를 기다리는 중...</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">온라인 관리자가 호출을 수락하면 채팅이 시작됩니다.</p>
              </div>
              <button
                onClick={handleCancelCall}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
              >
                <PhoneOff size={14} />
                호출 취소
              </button>
            </>
          )}

          {callStatus === 'connected' && (
            <>
              <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center">
                <CheckCircle2 size={24} className="text-green-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">관리자가 연결되었습니다!</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">화면 우측 하단의 채팅창을 확인하세요.</p>
              <button
                onClick={() => setCallStatus('idle')}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
              >
                닫기
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── 버그 제보 섹션 ───────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex items-center gap-2">
          <Bug size={15} className="text-red-primary dark:text-yellow-primary" />
          <span className="font-bold text-gray-800 dark:text-white text-sm">버그 제보</span>
        </div>
        <form onSubmit={handleBugSubmit} className="p-6 space-y-4">
          {bugSent && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-400/10 border border-green-400/30 text-green-600 dark:text-green-400 text-sm font-medium">
              <CheckCircle2 size={15} />
              버그 제보가 접수되었습니다. 감사합니다!
            </div>
          )}

          {/* 카테고리 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">카테고리</label>
            <div className="relative">
              <select
                value={bugCategory}
                onChange={e => setBugCategory(e.target.value)}
                className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
              >
                {BUG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">제목</label>
            <input
              value={bugTitle}
              onChange={e => setBugTitle(e.target.value)}
              placeholder="버그 제목을 간략하게 입력하세요"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">상세 설명</label>
            <textarea
              value={bugDesc}
              onChange={e => setBugDesc(e.target.value)}
              placeholder="어떤 상황에서 발생했는지, 어떤 동작을 기대했는지 설명해 주세요."
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!bugTitle.trim() || !bugDesc.trim() || bugSending}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors',
              'bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 hover:bg-red-hover dark:hover:bg-yellow-hover disabled:opacity-40'
            )}
          >
            <Send size={14} />
            {bugSending ? '제출 중...' : '제보 제출'}
          </button>
        </form>
      </section>
    </div>
  );
}
