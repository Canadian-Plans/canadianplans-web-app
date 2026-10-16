import { categoryHrefs, homeRedesign } from '@content/home-redesign';
import { HomeArt } from './art';

/** "So, what do you need today?" — dark card with four category tiles. */
export function HomeFinalCta() {
  const f = homeRedesign.final;
  return (
    <section className="cp-hd-section cp-hd-final" aria-labelledby="final-title">
      <div className="cp-hd-final-box">
        <span className="cp-hd-final-glow" data-glow="brand" aria-hidden="true" />
        <span className="cp-hd-final-glow" data-glow="mint" aria-hidden="true" />
        <div className="cp-hd-final-head">
          <p className="cp-hd-eyebrow">{f.eyebrow}</p>
          <h2 id="final-title" className="cp-hd-h cp-hd-final-title">
            {f.title}
          </h2>
          <p>{f.description}</p>
        </div>
        <ul className="cp-hd-tiles">
          {f.tiles.map((tile) => (
            <li key={tile.key}>
              <a className="cp-hd-tile" href={categoryHrefs[tile.key]} data-category={tile.key}>
                <span className="cp-hd-tile-icon" aria-hidden="true">
                  <HomeArt name={tile.icon} />
                </span>
                <span className="cp-hd-tile-copy">
                  <span>{tile.ask}</span>
                  <strong>{tile.title}</strong>
                </span>
                <span className="cp-hd-tile-go" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="cp-hd-final-unsure">
          <span>{f.unsure}</span>
          <a href={f.advisor.href}>{f.advisor.label}</a>
        </p>
      </div>
    </section>
  );
}
