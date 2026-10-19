import { homeRedesign } from '@content/home-redesign';

/** Customer stories on the warm band: three cards, each with a photo slot and tag. */
export function HomeStories() {
  const t = homeRedesign.testimonials;
  return (
    <section className="cp-hd-section cp-hd-stories" id="stories" aria-labelledby="stories-title">
      <div className="cp-hd-inner">
        <div className="cp-hd-stories-head">
          <div>
            <p className="cp-hd-eyebrow">{t.eyebrow}</p>
            <h2 id="stories-title" className="cp-hd-h cp-hd-section-title">
              {t.title}
            </h2>
          </div>
          <a className="cp-hd-pill-btn cp-hd-pill-outline" href={t.more.href}>
            {t.more.label}
          </a>
        </div>
        <div className="cp-hd-stories-grid">
          {t.items.map((item) => (
            <figure key={item.id} className="cp-hd-story">
              <div className="cp-hd-story-media">
                {item.photo ? (
                  <img src={item.photo} alt={item.alt} />
                ) : (
                  <div className="cp-hd-photo cp-hd-story-slot">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="9" cy="10" r="2" />
                      <path d="M21 16l-5-5-9 8" />
                    </svg>
                    <span>{item.photoHint}</span>
                  </div>
                )}
                <span className="cp-hd-story-tag" data-tone={item.tone}>
                  {item.category}
                </span>
              </div>
              <div className="cp-hd-story-body">
                <span className="cp-hd-story-quote" aria-hidden="true">
                  “
                </span>
                <blockquote>{item.quote}</blockquote>
                <figcaption>
                  <strong>{item.name}</strong>
                  <span>{item.meta}</span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
