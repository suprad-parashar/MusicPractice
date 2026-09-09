'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

/** Native dialogs handle focus containment, Escape, and restoration to the trigger. */
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (open && !element?.open) element?.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <header>
          <div>
            <p className="eyebrow">MAKE IT YOURS</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button variant="ghost" aria-label="Close preferences" onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
