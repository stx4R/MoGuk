'use client';
// 전체 접속자 목록 공유 Context — UserSessionManager에서 채우고 Admin Dashboard에서 읽음 S
import { createContext, useContext, useState, type ReactNode } from 'react';

export type OnlineUser = { user_id: string; name: string; pp: string; online_at: string };

type Ctx = { onlineUsers: OnlineUser[]; setOnlineUsers: (u: OnlineUser[]) => void };

const OnlineUsersContext = createContext<Ctx>({ onlineUsers: [], setOnlineUsers: () => {} });

export function OnlineUsersProvider({ children }: { children: ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  return (
    <OnlineUsersContext.Provider value={{ onlineUsers, setOnlineUsers }}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

export const useOnlineUsers = () => useContext(OnlineUsersContext);
