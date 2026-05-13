'use client';
// PIP 모드 채팅창 전역 상태 — 어느 탭에서든 활성화 가능 S
import { createContext, useContext, useState, type ReactNode } from 'react';

type Ctx = { pipRoomId: string | null; setPipRoomId: (id: string | null) => void };

const PIPChatContext = createContext<Ctx>({ pipRoomId: null, setPipRoomId: () => {} });

export function PIPChatProvider({ children }: { children: ReactNode }) {
  const [pipRoomId, setPipRoomId] = useState<string | null>(null);
  return (
    <PIPChatContext.Provider value={{ pipRoomId, setPipRoomId }}>
      {children}
    </PIPChatContext.Provider>
  );
}

export const usePIPChat = () => useContext(PIPChatContext);
