'use client';

import type { ReactNode } from 'react';

/**
 * Shared layout for read-only “theory” steps in the Learn curriculum.
 */
export function LearnTheoryArticle({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 sm:p-8 shadow-2xl">
      <h2 className="text-xl font-light tracking-wide text-slate-100 sm:text-2xl">{title}</h2>
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-300 [&_strong]:font-medium [&_strong]:text-slate-100 [&_h3]:mt-8 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-slate-400 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
      {footer ? <div className="mt-8 border-t border-slate-600/40 pt-6">{footer}</div> : null}
    </article>
  );
}
