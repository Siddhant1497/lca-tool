import React, { createContext, useCallback, useContext, useState } from 'react';
import Icon from './Icon';

type Tone = 'ok' | 'err' | 'info';
interface T { id: number; msg: string; tone: Tone }
const Ctx = createContext<(msg: string, tone?: Tone) => void>(() => {});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [list, setList] = useState<T[]>([]);
  const push = useCallback((msg: string, tone: Tone = 'ok') => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, msg, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <Icon name={t.tone === 'err' ? 'alert' : t.tone === 'info' ? 'info' : 'check'} size={16} />{t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};
export const useToast = () => useContext(Ctx);
