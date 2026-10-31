import React, { useRef } from 'react';
import { useHub } from '../../context/HubContext';
import { parseGhgCsv } from '../../utils/hub';
import { useToast } from './Toast';
import Icon from './Icon';

/** Button + hidden file input that imports a GHG CSV and reports the result as a toast. */
const ImportGhg: React.FC<{ label?: string; className?: string; onDone?: () => void }> = ({ label = 'Import CSV', className = 'btn btn-out', onDone }) => {
  const { hub, dispatch } = useHub();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const rows = parseGhgCsv(await f.text());
      if (hub.isSample) dispatch({ type: 'START_EMPTY' });
      dispatch({ type: 'SET_GHG', ghg: rows });
      toast(`Imported ${rows.length} inventory year${rows.length > 1 ? 's' : ''} (${rows[0].year}–${rows[rows.length - 1].year})`);
      onDone?.();
    } catch (e) { toast((e as Error).message, 'err'); }
    if (ref.current) ref.current.value = '';
  };
  return (
    <>
      <input ref={ref} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} data-testid="ghg-file" />
      <button className={className} onClick={() => ref.current?.click()}><Icon name="upload" size={16} />{label}</button>
    </>
  );
};
export default ImportGhg;
