import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Trash2, Unplug, X, LoaderCircle, Info } from 'lucide-react';
import { createFeedbackController } from './workspaceFeedback.js';
import './WorkspaceFeedback.css';

export default function WorkspaceFeedback() {
  const [active, setActive] = useState(null);
  const controller = useRef(null), dialog = useRef(null);
  useEffect(() => {
    const manager = createFeedbackController(setActive);
    controller.current = manager;
    const notify = event => {
      const {type,message}=event.detail || {};
      if (type === 'loading') manager.loading(String(message || 'Guardando…'));
      else if (['success','error','info'].includes(type)) manager.result(type,String(message || ''));
    };
    const confirm = event => {
      if (!event.detail || event.detail.handled) return;
      event.detail.handled = true; manager.confirm(event.detail);
    };
    window.addEventListener('workspace:notify', notify);
    window.addEventListener('workspace:confirm', confirm);
    return () => {
      window.removeEventListener('workspace:notify', notify);
      window.removeEventListener('workspace:confirm', confirm);
      manager.dispose(); controller.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      (dialog.current?.querySelector('[data-initial-focus]') || dialog.current)?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus?.({ preventScroll:true });
      else document.querySelector('.private-root .private-sidebar-link')?.focus({ preventScroll:true });
    };
  }, [active?.id]);

  if (!active) return null;
  const success = active.kind !== 'confirm';
  const loading = active.kind === 'loading';
  const tone = active.kind === 'error' ? 'error' : active.kind === 'info' ? 'info' : loading ? 'loading' : 'success';
  const closing = active.phase === 'closing';
  const Icon = success ? (loading ? LoaderCircle : tone === 'error' ? X : tone === 'info' ? Info : CheckCircle2) : active.danger === false ? Unplug : Trash2;
  return createPortal(
    <div className={`wsf-overlay ${closing ? 'is-closing' : ''}`}>
      <section key={active.id} ref={dialog} tabIndex={-1}
        className={`wsf-dialog ${success ? `wsf-success wsf-result-${tone}` : 'wsf-confirm'} ${closing ? 'is-closing' : ''}`}
        role={success ? 'dialog' : 'alertdialog'} aria-modal="true"
        aria-labelledby={`wsf-title-${active.id}`}
        aria-describedby={!success ? `wsf-description-${active.id}` : undefined}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Escape' && !success) controller.current?.close(false);
          if (event.key === 'Tab') {
            const items = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
            if (!items.length) { event.preventDefault(); return; }
            const first=items[0], last=items[items.length-1];
            if(event.shiftKey && (document.activeElement===first || document.activeElement===dialog.current)) {event.preventDefault();last.focus();}
            else if(!event.shiftKey && (document.activeElement===last || document.activeElement===dialog.current)) {event.preventDefault();first.focus();}
          }
        }}>
        <span className={`wsf-icon ${success ? `is-${tone}` : active.danger===false ? 'is-info' : 'is-danger'}`} aria-hidden="true"><Icon size={success ? 46 : 26} strokeWidth={success ? 1.8 : 2}/></span>
        {!success && <button className="wsf-close" type="button" aria-label="Cerrar" disabled={closing} onClick={()=>controller.current?.close(false)}><X size={19}/></button>}
        <h2 id={`wsf-title-${active.id}`}>{success ? active.message : active.title || 'Confirmar acción'}</h2>
        {success ? <span className="wsf-sr" role="status">{active.message}</span> : <>
          <p id={`wsf-description-${active.id}`}>{active.message}</p>
          <div className="wsf-actions"><button data-initial-focus type="button" disabled={closing} onClick={()=>controller.current?.close(false)}>Cancelar</button><button className={active.danger===false?'wsf-primary':'wsf-danger'} type="button" disabled={closing} onClick={()=>controller.current?.close(true)}>{active.confirmLabel || 'Confirmar'}</button></div>
        </>}
      </section>
    </div>, document.body
  );
}
