import { version } from '@/package.json';
import type { Tab } from '@/lib/settings';
import { Icon } from '@/components/ui/Icon';
import { ResponsiveAside } from '@/components/ui/ResponsiveAside';
import { NAVIGATION } from './navigation';

export function StudioNavigation({
  activeTab,
  onNavigate,
  onPreferences,
  open,
  onClose,
}: {
  activeTab: Tab;
  onNavigate: (tab: Tab) => void;
  onPreferences: () => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ResponsiveAside
      id="studio-navigation"
      label="Main navigation"
      className="studio-navigation"
      open={open}
      onClose={onClose}
      breakpoint="(min-width: 1024px)"
    >
      <div className="brand">
        <span className="brand-mark">
          <Icon name="ragas" size={25} />
        </span>
        <div>
          Carnatic<span>PRACTICE</span>
        </div>
        <button
          type="button"
          className="navigation-close"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <p className="brand-caption">A space for your saadhana.</p>
      <nav aria-label="Practice sections">
        {(['Practice', 'Discover'] as const).map((group) => (
          <div className="navigation-group" key={group}>
            <p>{group}</p>
            {NAVIGATION.filter((item) => item.group === group).map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`navigation-link ${activeTab === item.id ? 'is-active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
                {activeTab === item.id && <span className="navigation-dot" />}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="navigation-bottom">
        <div className="practice-note">
          <span className="practice-note-line" />
          <p>
            One note.
            <br />
            One day at a time.
          </p>
          <span>A LITTLE PRACTICE, EVERY DAY</span>
        </div>
        <button type="button" className="navigation-link" onClick={onPreferences}>
          <Icon name="settings" size={19} />
          <span>Preferences</span>
        </button>
        <p className="navigation-version">
          CARNATIC PRACTICE <span>v{version}</span>
        </p>
      </div>
    </ResponsiveAside>
  );
}
