import React, { useEffect, useRef, useState } from 'react';
import { useHub } from '../context/HubContext';
import { useLCA } from '../context/LCAContext';
import { useToast } from './ui/Toast';
import { ask } from '../utils/platform';
import Icon from './ui/Icon';

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

/** Header control: pick, add, rename or remove a client workspace. Each client's data is stored separately. */
const ClientSwitcher: React.FC = () => {
  const { clients, client, switchClient, addClient, renameClient, deleteClient, hub, readOnly } = useHub();
  const { dispatch: nav } = useLCA();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'add' | 'rename'>('list');
  const [name, setName] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) { setOpen(false); setMode('list'); } };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setMode('list'); } };
    document.addEventListener('mousedown', h); window.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('keydown', k); };
  }, [open]);

  if (readOnly) return <span className="chip"><span className="client-av sm">{initials(client.name)}</span>{client.name}</span>;

  const submit = () => {
    if (!name.trim()) return;
    if (mode === 'add') { addClient(name); toast(`Created client "${name.trim()}"`); nav({ type: 'SET_PAGE', page: 'hub' }); }
    else { renameClient(client.id, name); toast('Client renamed'); }
    setName(''); setMode('list'); setOpen(false);
  };

  return (
    <div className="client-sw" ref={box}>
      <button className="client-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(!open); setMode('list'); }} title="Switch client">
        <span className="client-av">{initials(client.name)}</span>
        <span className="client-name">{client.name}</span>
        {hub.isSample && <span className="badge b-warn" style={{ marginLeft: 2 }}>Sample</span>}
        <Icon name="chevR" size={14} className="client-chev" />
      </button>
      {open && (
        <div className="client-pop" role="menu">
          {mode === 'list' ? (<>
            <div className="client-hd">Clients · {clients.length}</div>
            <div className="client-list">
              {clients.map((c) => (
                <button key={c.id} role="menuitemradio" aria-checked={c.id === client.id} className={`client-item${c.id === client.id ? ' on' : ''}`}
                  onClick={() => { switchClient(c.id); setOpen(false); if (c.id !== client.id) toast(`Switched to ${c.name}`, 'info'); }}>
                  <span className="client-av sm">{initials(c.name)}</span><span className="grow">{c.name}</span>{c.id === client.id && <Icon name="check" size={15} />}
                </button>
              ))}
            </div>
            <div className="divider" style={{ margin: '6px 0' }} />
            <button className="client-item" onClick={() => { setMode('add'); setName(''); }}><Icon name="plus" size={15} />New client</button>
            <button className="client-item" onClick={() => { setMode('rename'); setName(client.name); }}><Icon name="edit" size={15} />Rename "{client.name}"</button>
            <button className="client-item" onClick={() => { setOpen(false); nav({ type: 'SET_PAGE', page: 'share' }); }}><Icon name="link" size={15} />Share with this client</button>
            {clients.length > 1 && (
              <button className="client-item danger" onClick={async () => {
                setOpen(false);
                if (await ask(`Delete client "${client.name}" and all of its data on this computer? Download a backup first if you may need it.`)) { const n = client.name; deleteClient(client.id); toast(`Deleted ${n}`, 'info'); }
              }}><Icon name="trash" size={15} />Delete this client</button>
            )}
          </>) : (
            <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ padding: 6 }}>
              <div className="client-hd" style={{ padding: '2px 2px 8px' }}>{mode === 'add' ? 'New client' : 'Rename client'}</div>
              <input className="inp" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Developers Pvt Ltd" aria-label="Client name" />
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-out btn-sm" onClick={() => setMode('list')}>Back</button>
                <button type="submit" className="btn btn-pri btn-sm" disabled={!name.trim()}>{mode === 'add' ? 'Create' : 'Save'}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
export default ClientSwitcher;
