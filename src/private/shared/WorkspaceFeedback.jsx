import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Unplug, X } from 'lucide-react';
import { createFeedbackController } from './workspaceFeedback.js';
import './WorkspaceFeedback.css';

const STATUS_LABEL = {
  success: 'OPERACIÓN COMPLETADA',
  error: 'NO SE PUDO COMPLETAR',
  info: 'INFORMACIÓN',
  warning: 'REQUIERE ATENCIÓN',
  loading: 'PROCESANDO',
};

// SVG minimalista: el trazo se dibuja por CSS sin importar una biblioteca de animación.
function KineticGlyph({ tone }) {
  if (tone === 'loading') {
    return (
      <svg className="wsf-glyph" viewBox="0 0 72 72" aria-hidden="true">
        <circle className="wsf-glyph-track" cx="36" cy="36" r="24" />
        <g className="wsf-glyph-loader">
          <path className="wsf-glyph-loader-path" d="M36 12 A24 24 0 0 1 56.78 24" />
          <circle className="wsf-glyph-loader-dot" cx="56.78" cy="24" r="3.2" />
        </g>
      </svg>
    );
  }

  return (
    <svg className="wsf-glyph" viewBox="0 0 72 72" aria-hidden="true">
      <g className="wsf-glyph-frame">
        <circle className="wsf-glyph-track" cx="36" cy="36" r="24" />
        <circle className="wsf-glyph-ring" cx="36" cy="36" r="24" />
        {tone === 'error' ? (
          <>
            <path className="wsf-glyph-stroke wsf-glyph-cross-a" d="M28 28 L44 44" />
            <path className="wsf-glyph-stroke wsf-glyph-cross-b" d="M44 28 L28 44" />
          </>
        ) : tone === 'warning' ? (
          <>
            <path className="wsf-glyph-stroke wsf-glyph-bang-line" d="M36 25 L36 39" />
            <path className="wsf-glyph-stroke wsf-glyph-bang-dot" d="M36 47 L36 48" />
          </>
        ) : tone === 'info' ? (
          <>
            <path className="wsf-glyph-stroke wsf-glyph-info-dot" d="M36 24 L36 25" />
            <path className="wsf-glyph-stroke wsf-glyph-info-line" d="M36 34 L36 48" />
          </>
        ) : (
          <>
            <path className="wsf-glyph-stroke wsf-glyph-check-short" d="M24 37 L32 45" />
            <path className="wsf-glyph-stroke wsf-glyph-check-long" d="M32 45 L49 27" />
            <circle className="wsf-glyph-spark" cx="52" cy="26" r="2.3" />
          </>
        )}
      </g>
    </svg>
  );
}

export default function WorkspaceFeedback() {
  const [active, setActive] = useState(null);
  const controller = useRef(null);
  const dialog = useRef(null);

  useEffect(() => {
    const manager = createFeedbackController(setActive);
    controller.current = manager;
    const notify = event => {
      const { type, message } = event.detail || {};
      if (type === 'loading') manager.loading(String(message || 'Guardando…'));
      else if (['success', 'error', 'info'].includes(type)) manager.result(type, String(message || ''));
    };
    const confirm = event => {
      if (!event.detail || event.detail.handled) return;
      event.detail.handled = true;
      manager.confirm(event.detail);
    };
    window.addEventListener('workspace:notify', notify);
    window.addEventListener('workspace:confirm', confirm);
    return () => {
      window.removeEventListener('workspace:notify', notify);
      window.removeEventListener('workspace:confirm', confirm);
      manager.dispose();
      controller.current = null;
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
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
      else document.querySelector('.private-root .private-sidebar-link')?.focus({ preventScroll: true });
    };
  }, [active?.id]);

  if (!active) return null;
  const isResult = active.kind !== 'confirm';
  const tone = isResult ? active.kind : null;
  const closing = active.phase === 'closing';
  const ConfirmIcon = active.danger === false ? Unplug : Trash2;
  const holdDuration = tone === 'error' ? '1900ms' : tone === 'warning' ? '1700ms' : '1450ms';

  return createPortal(
    <div
      className={`wsf-overlay ${isResult ? 'is-result' : ''} ${closing ? 'is-closing' : ''}`}
      onClick={event => {
        // Solo un clic sobre el fondo cierra resultados ya visibles.
        // Las confirmaciones y el estado de carga no se descartan.
        if (event.target !== event.currentTarget) return;
        if (!isResult || tone === 'loading' || closing || active.phase !== 'visible' || active.morphing) return;
        controller.current?.close();
      }}
    >
      <section
        key={active.id}
        ref={dialog}
        tabIndex={-1}
        className={`wsf-dialog ${isResult ? `wsf-success wsf-result-${tone} wsf-kinetic-result` : 'wsf-confirm'} ${closing ? 'is-closing' : ''} ${active.morphing ? 'is-morphing' : ''}`}
        style={isResult ? { '--wsf-hold-duration': holdDuration } : undefined}
        role={isResult ? (tone === 'error' ? 'alertdialog' : 'dialog') : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={`wsf-title-${active.id}`}
        aria-describedby={!isResult ? `wsf-description-${active.id}` : undefined}
        onAnimationEnd={event => {
          if (event.target !== event.currentTarget || !closing) return;
          const expectedName = isResult ? 'wsf-kinetic-window-out' : 'wsf-window-out';
          if (event.animationName === expectedName) controller.current?.finishClose(active.id);
        }}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Escape' && (!isResult || (tone !== 'loading' && active.phase === 'visible' && !active.morphing))) controller.current?.close(false);
          if (event.key === 'Tab') {
            const items = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
            if (!items.length) { event.preventDefault(); return; }
            const first = items[0], last = items[items.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
              event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
              event.preventDefault(); first.focus();
            }
          }
        }}
      >
        {isResult ? (
          <>
            <span className="wsf-kinetic-meta">{STATUS_LABEL[tone] || STATUS_LABEL.info}</span>
            <span className="wsf-kinetic-seal" aria-hidden="true">
              <KineticGlyph key={tone} tone={tone} />
            </span>
            <div className="wsf-kinetic-copy" key={tone}>
              <h2 id={`wsf-title-${active.id}`}>{active.message}</h2>
            </div>
            <span className="wsf-sr" role={tone === 'error' ? 'alert' : 'status'}>{active.message}</span>
            {tone !== 'loading' && (
              <span className="wsf-kinetic-progress" aria-hidden="true"><span /></span>
            )}
          </>
        ) : (
          <>
            <span className={`wsf-icon ${active.danger === false ? 'is-info' : 'is-danger'}`} aria-hidden="true">
              <ConfirmIcon size={26} strokeWidth={2} />
            </span>
            <button className="wsf-close" type="button" aria-label="Cerrar" disabled={closing} onClick={() => controller.current?.close(false)}>
              <X size={19} />
            </button>
            <h2 id={`wsf-title-${active.id}`}>{active.title || 'Confirmar acción'}</h2>
            <p id={`wsf-description-${active.id}`}>{active.message}</p>
            <div className="wsf-actions">
              <button data-initial-focus type="button" disabled={closing} onClick={() => controller.current?.close(false)}>Cancelar</button>
              <button className={active.danger === false ? 'wsf-primary' : 'wsf-danger'} type="button" disabled={closing} onClick={() => controller.current?.close(true)}>{active.confirmLabel || 'Confirmar'}</button>
            </div>
          </>
        )}
      </section>
    </div>, document.body
  );
}
