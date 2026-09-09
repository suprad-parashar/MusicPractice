import type { Raga } from '@/data/ragas';
import { Icon } from '@/components/ui/Icon';

export function DailyRaga({ raga, onExplore }: { raga: Raga; onExplore: () => void }) {
  return (
    <section className="daily-raga" aria-labelledby="daily-raga-title">
      <div>
        <p className="eyebrow">
          <span /> A LITTLE DISCOVERY, EVERY DAY
        </p>
        <h2 id="daily-raga-title">Meet {raga.name}.</h2>
        <p>Your raga of the day. A new color for your practice.</p>
        <button type="button" onClick={onExplore}>
          Explore this raga <Icon name="arrow" size={16} />
        </button>
      </div>
      <svg className="daily-raga-art" viewBox="0 0 260 200" fill="none" aria-hidden="true">
        <circle cx="168" cy="100" r="89" fill="currentColor" opacity=".06" />
        <circle cx="168" cy="100" r="68" stroke="currentColor" opacity=".18" />
        <circle cx="168" cy="100" r="48" stroke="currentColor" opacity=".2" />
        <path
          d="M32 134c38-94 61 63 100-10s66-86 100-39M16 145c39-83 67 49 107-10s77-93 121-41"
          stroke="currentColor"
          opacity=".3"
        />
        <path d="M130 28v121m9-125v130m9-132v133m9-132v129" stroke="currentColor" opacity=".6" />
        <path
          d="M114 138c-12 22-1 43 26 43s42-21 28-43l-12-10V26h-24v102l-18 10Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M125 30h37m-37 9h37m-37 9h37m-37 9h37m-41 101h38" stroke="currentColor" />
        <circle cx="210" cy="41" r="4" fill="currentColor" opacity=".5" />
        <circle cx="49" cy="91" r="3" fill="currentColor" opacity=".3" />
      </svg>
    </section>
  );
}
