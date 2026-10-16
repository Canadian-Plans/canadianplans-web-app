import { categoryHrefs, homeRedesign } from '@content/home-redesign';
import { HomeArt } from './art';

/** "What are you looking for?" — four category cards with a grey illustration well. */
export function HomePicker() {
  const p = homeRedesign.picker;
  return (
    <section className="cp-hd-section cp-hd-picker" aria-labelledby="picker-title">
      <div className="cp-hd-inner cp-hd-picker-inner">
        <span className="cp-hd-pill">{p.eyebrow}</span>
        <h2 id="picker-title" className="cp-hd-h cp-hd-display">
          {p.title}
        </h2>
        <p className="cp-hd-picker-lead">{p.description}</p>
        <ul className="cp-hd-picker-grid">
          {p.cards.map((card) => (
            <li key={card.key}>
              <a className="cp-hd-catcard" href={categoryHrefs[card.key]} data-category={card.key}>
                <span className="cp-hd-catcard-art">
                  <HomeArt name={card.icon} />
                </span>
                <strong className="cp-hd-h">{card.title}</strong>
                <span className="cp-hd-catcard-price">{card.price}</span>
                <span className="cp-hd-catcard-go">{p.more}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="cp-hd-bundle">
          {p.bundleLead} <a href="/contact">{p.bundleLink}</a>
        </p>
      </div>
    </section>
  );
}
