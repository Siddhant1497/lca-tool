import React, { useEffect, useRef } from 'react';
import Icon from './Icon';

interface Props { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }

/** Accessible modal: Esc closes, focus moves inside, backdrop click closes. */
const Modal: React.FC<Props> = ({ title, onClose, children, footer, wide }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus();
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => { window.removeEventListener('keydown', h); prev?.focus(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-hdr"><h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-ftr">{footer}</div>}
      </div>
    </div>
  );
};
export default Modal;
