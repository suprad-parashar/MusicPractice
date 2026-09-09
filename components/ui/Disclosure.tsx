import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Disclosure({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`disclosure ${className}`}>
      <summary>
        {title}
        <Icon name="down" size={15} />
      </summary>
      <div className="disclosure-content">{children}</div>
    </details>
  );
}
