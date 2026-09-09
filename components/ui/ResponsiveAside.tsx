'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex="0"]';

/** Keep accompaniment mounted across breakpoints, so opening a drawer never restarts audio. */
export function ResponsiveAside({
  label,
  open,
  onClose,
  breakpoint,
  className,
  children,
  id,
}: {
  label: string;
  open: boolean;
  onClose: () => void;
  breakpoint: string;
  className: string;
  children: ReactNode;
  id: string;
}) {
  const desktop = useMediaQuery(breakpoint);
  const panel = useRef<HTMLElement>(null);
  const modal = open && !desktop;

  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab' || !element) return;
      const items = Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (item) => item.getClientRects().length > 0,
      );
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [modal, onClose]);

  return (
    <>
      {modal && <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside
        ref={panel}
        id={id}
        className={`${className} ${open ? 'is-open' : ''}`}
        aria-label={label}
        role={modal ? 'dialog' : undefined}
        aria-modal={modal || undefined}
        inert={!desktop && !open}
      >
        {children}
      </aside>
    </>
  );
}
