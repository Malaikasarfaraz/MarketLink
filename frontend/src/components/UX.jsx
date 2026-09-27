import { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CONFIRM_EVENT = 'marketlink:confirm';

// Central Toastify helper used throughout MarketLink.
// Every toast uses the same 4-second auto-close timer and Toastify's
// built-in progress bar so the remaining time is visually clear.
export function notify(message, type = 'info') {
  if (!message) return;
  const options = {
    autoClose: 4000,
    closeOnClick: true,
    pauseOnHover: true,
    pauseOnFocusLoss: true,
    draggable: true,
    newestOnTop: true,
  };
  if (type === 'success') toast.success(message, options);
  else if (type === 'error') toast.error(message, options);
  else if (type === 'warning') toast.warning(message, options);
  else toast.info(message, options);
}

export function askConfirm({ title = 'Please confirm', message = 'Are you sure?', confirmLabel = 'Confirm', danger = false } = {}) {
  if (typeof window === 'undefined' || typeof window.marketlinkConfirm !== 'function') {
    return Promise.resolve(false);
  }
  return window.marketlinkConfirm({ title, message, confirmLabel, danger });
}

export function UXProvider({ children }) {
  const [confirm, setConfirm] = useState(null);
  const confirmResolver = useRef(null);

  useEffect(() => {
    const onConfirm = (event) => {
      if (confirmResolver.current) confirmResolver.current(false);
      setConfirm(event.detail || {});
    };

    window.addEventListener(CONFIRM_EVENT, onConfirm);
    window.marketlinkConfirm = (options) => new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirm(options);
    });

    return () => {
      window.removeEventListener(CONFIRM_EVENT, onConfirm);
      delete window.marketlinkConfirm;
    };
  }, []);

  useEffect(() => {
    if (!confirm) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') closeConfirm(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [confirm]);

  function closeConfirm(value) {
    if (confirmResolver.current) confirmResolver.current(value);
    confirmResolver.current = null;
    setConfirm(null);
  }

  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        pauseOnFocusLoss
        draggable
        theme="colored"
        limit={4}
      />

      {confirm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeConfirm(false); }}>
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className="eyebrow">MARKETLINK</div>
            <h2 id="confirm-title">{confirm.title || 'Please confirm'}</h2>
            <p>{confirm.message || 'Are you sure?'}</p>
            <div className="modal-actions">
              <button type="button" className="button light" onClick={() => closeConfirm(false)}>Cancel</button>
              <button type="button" className={`button ${confirm.danger ? 'danger-button' : ''}`} autoFocus onClick={() => closeConfirm(true)}>{confirm.confirmLabel || 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
