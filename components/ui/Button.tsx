import type { ButtonHTMLAttributes } from 'react';
import { Icon } from './Icon';

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  return <button type="button" className={`button button--${variant} ${className}`} {...props} />;
}

export function PlaybackButton({
  playing,
  loading,
  label,
  onClick,
  compact = false,
}: {
  playing: boolean;
  loading?: boolean;
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const action = loading ? 'Loading…' : playing ? 'Stop' : 'Play';
  return (
    <Button
      variant={compact ? 'secondary' : 'primary'}
      className={`playback-button ${compact ? 'playback-button--compact' : ''}`}
      onClick={onClick}
      disabled={loading}
      aria-label={`${action} ${label}`}
      aria-pressed={playing}
    >
      <Icon
        name={playing ? 'stop' : 'play'}
        size={compact ? 16 : 18}
        fill="currentColor"
        strokeWidth="0"
      />
      {!compact && (
        <span>
          {action}
          {!loading && !playing ? ` ${label === 'raga' ? 'scale' : label}` : ''}
        </span>
      )}
    </Button>
  );
}
