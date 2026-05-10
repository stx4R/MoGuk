'use client';

// Admin 전용 3단 레이아웃 대시보드 S
import { useState } from 'react';
import { Users, MessageSquare, BarChart2, Send, Shield } from 'lucide-react';

// 임시 더미 데이터 — Supabase Presence 연동 후 교체 예정 S
const DUMMY_USERS = [
  { id: '1', name: '홍길동', online: true },
  { id: '2', name: '김철수', online: true },
  { id: '3', name: '이영희', online: false },
  { id: '4', name: '박민수', online: true },
  { id: '5', name: '최지원', online: false },
];

type ChatMessage = {
  id: string;
  author: string;
  content: string;
  timestamp: string;
};

const COMMANDS = ['/kick', '/ban', '/timeout', '/announcement'];

export default function AdminDashboardPage() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', author: 'Admin', content: '어드민 채널에 오신 것을 환영합니다.', timestamp: '14:00' },
  ]);
  const [showCommands, setShowCommands] = useState(false);

  const handleInputChange = (v: string) => {
    setChatInput(v);
    setShowCommands(v.startsWith('/'));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const isCommand = chatInput.startsWith('/');
    if (isCommand) {
      // TODO: 명령어 파싱 및 Supabase RPC 호출 S
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          author: 'Admin (명령)',
          content: `명령어 실행: ${chatInput}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          author: 'Admin',
          content: chatInput,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    setChatInput('');
    setShowCommands(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* 좌측: 실시간 사용자 목록 */}
      <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface flex flex-col max-md:hidden">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            <Users size={16} className="text-red-primary dark:text-yellow-primary" />
            접속자 ({DUMMY_USERS.filter((u) => u.online).length}명 온라인)
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {DUMMY_USERS.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white dark:hover:bg-dark-bg transition-colors cursor-pointer group"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  user.online ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                {user.name}
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* 중앙: Admin 전용 채팅 + 명령어 */}
      <section className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-dark-border">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-dark-border flex items-center gap-2">
          <Shield size={16} className="text-red-primary dark:text-yellow-primary" />
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
            Admin 전용 채널
          </span>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
            Private
          </span>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-red-primary dark:text-yellow-primary">
                  {msg.author}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {msg.timestamp}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-dark-surface rounded-xl rounded-tl-sm px-3 py-2 max-w-lg">
                {msg.content}
              </p>
            </div>
          ))}
        </div>

        {/* 명령어 자동완성 팝업 */}
        {showCommands && (
          <div className="mx-4 mb-1 border border-gray-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-surface shadow-lg">
            {COMMANDS.filter((c) => c.startsWith(chatInput)).map((cmd) => (
              <button
                key={cmd}
                onMouseDown={() => { setChatInput(cmd + ' '); setShowCommands(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-mono text-red-primary dark:text-yellow-primary hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        )}

        {/* 입력창 */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-dark-border flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="메시지 입력 또는 /명령어"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-800 dark:text-gray-200 outline-none focus:border-red-primary dark:focus:border-yellow-primary transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-red-primary dark:bg-yellow-primary text-white dark:text-gray-900 hover:bg-red-hover dark:hover:bg-yellow-hover transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </section>

      {/* 우측: 퀵 스탯 + 로그 */}
      <aside className="w-72 shrink-0 bg-gray-50 dark:bg-dark-surface flex flex-col max-md:hidden">
        <div className="px-4 py-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
            <BarChart2 size={16} className="text-red-primary dark:text-yellow-primary" />
            현황 & 로그
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 퀵 스탯 */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '총 접속자', value: DUMMY_USERS.filter((u) => u.online).length },
              { label: '진행 안건', value: 3 },
              { label: '총 투표수', value: 142 },
              { label: '경고 처리', value: 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-3 text-center"
              >
                <p className="text-2xl font-extrabold text-red-primary dark:text-yellow-primary">
                  {s.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 액션 로그 */}
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
              관리자 로그
            </p>
            <div className="space-y-2">
              {[
                { time: '13:45', action: '투표 #1 개시', admin: 'Admin' },
                { time: '14:00', action: '공지 발송', admin: 'Admin' },
                { time: '14:12', action: '투표 #2 개시', admin: 'Admin' },
              ].map((log, i) => (
                <div
                  key={i}
                  className="flex gap-2 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-bg rounded-lg px-3 py-2 border border-gray-100 dark:border-dark-border"
                >
                  <span className="text-gray-400 dark:text-gray-500 shrink-0">{log.time}</span>
                  <span className="flex-1">{log.action}</span>
                  <span className="text-red-primary dark:text-yellow-primary font-medium shrink-0">
                    {log.admin}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
