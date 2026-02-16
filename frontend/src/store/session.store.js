import { create } from 'zustand';

const sessionStore = create((set) => ({
  sessions: [],
  currentSession: null,

  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (session) => set({ currentSession: session }),
  addSession: (session) => set((state) => ({ 
    sessions: [...state.sessions, session] 
  })),
  removeSession: (sessionId) => set((state) => ({
    sessions: state.sessions.filter(s => s.id !== sessionId)
  }))
}));

export default sessionStore;
