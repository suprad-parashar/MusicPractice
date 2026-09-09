import { getMelakartaByNumber, getRagaByIdOrName, type Raga } from '@/data/ragas';
import { Disclosure } from '@/components/ui/Disclosure';

export const hasText = (text: string) =>
  Boolean(text.trim()) && text.trim().toLowerCase() !== 'unknown';
export const displayText = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1).replaceAll('-', ' ');

export function RagaReference({ raga, onSelect }: { raga: Raga; onSelect: (raga: Raga) => void }) {
  const meta = raga.meta;
  const parent =
    !meta.isMelakarta && meta.parentMelakarta ? getMelakartaByNumber(meta.parentMelakarta) : null;
  const facts = [
    { label: 'Time of day', value: meta.timeOfDay },
    { label: 'Rasa · emotional color', value: meta.rasa.join(', ') },
    { label: 'Structure', value: meta.ragaType },
  ].filter(({ value }) => hasText(value));
  const prose = [
    { title: 'About this raga', content: meta.description },
    { title: 'Mood & character', content: meta.mood },
    { title: 'Gamaka & phrasing', content: meta.gamakaUsage },
    { title: 'Notable features', content: meta.notableFeatures },
  ].filter(({ content }) => hasText(content));
  const related = meta.popularJanyaRagas
    .map(getRagaByIdOrName)
    .filter((item): item is Raga => Boolean(item));

  return (
    <section className="raga-reference" aria-label="About the selected raga">
      <h3>A little more about {raga.name}</h3>
      {facts.length > 0 && (
        <dl className="reference-facts">
          {facts.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{displayText(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {prose.map(({ title, content }) => (
        <Disclosure key={title} title={title}>
          {content.split(/\n\n+/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </Disclosure>
      ))}
      {(parent || related.length > 0) && (
        <Disclosure title={parent ? 'Parent melakarta' : 'Related janya ragas'}>
          <div className="related-ragas">
            {(parent ? [parent] : related).map((item) => (
              <button key={item.ragaId} type="button" onClick={() => onSelect(item)}>
                {item.name} ↗
              </button>
            ))}
          </div>
        </Disclosure>
      )}
      {meta.notableCompositions.length > 0 && (
        <Disclosure title="Notable compositions">
          <ul>
            {meta.notableCompositions.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                {item.name}
                {item.composer && ` · ${item.composer}`}
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
      {(hasText(meta.inventor) ||
        meta.otherNames.length > 0 ||
        hasText(meta.hindustaniEquivalent) ||
        hasText(meta.westernEquivalent)) && (
        <Disclosure title="Origins & connections">
          {hasText(meta.inventor) && <p>Attributed to {meta.inventor}</p>}
          {meta.otherNames.length > 0 && <p>Also known as {meta.otherNames.join(' · ')}</p>}
          {hasText(meta.hindustaniEquivalent) && (
            <p>Hindustani equivalent: {meta.hindustaniEquivalent}</p>
          )}
          {hasText(meta.westernEquivalent) && <p>Western equivalent: {meta.westernEquivalent}</p>}
        </Disclosure>
      )}
      <div className="reference-links">
        {[
          { label: 'Wikipedia', href: meta.wikipediaUrl },
          { label: 'Raga Surabhi', href: meta.ragasurabhiUrl },
          { label: 'Listen on YouTube', href: meta.youtubeUrl },
        ]
          .filter(({ href }) => hasText(href))
          .map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noreferrer">
              {label} ↗
            </a>
          ))}
      </div>
    </section>
  );
}
