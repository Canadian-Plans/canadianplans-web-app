import { Card } from '@canadian-plans/ui';
import { CpButton, CpFaqAccordion, CpImageSlot } from '@canadian-plans/ui/canadian-plans';
import { guideAssets, guideCopy, type ArticleBlock } from '@content/guides';

/** Keep source mobile line breaks while allowing wider layouts to flow naturally. */
export function GuideText({
  text,
  mobileLines,
}: {
  text: string;
  mobileLines?: readonly string[];
}) {
  return mobileLines
    ? mobileLines.map((line, index) => (
        <span className="cp-guide-mobile-line" key={line}>
          {line}
          {index < mobileLines.length - 1 ? ' ' : ''}
        </span>
      ))
    : text;
}

export function GuidePromotion({ className = '' }: { className?: string }) {
  return (
    <Card className={`cp-guide-promotion ${className}`}>
      <h2>{guideCopy.promotion.title}</h2>
      <p className="cp-guide-promotion-price">
        <span>{guideCopy.promotion.from}</span>
        <strong>{guideCopy.promotion.price}</strong>
        <span>{guideCopy.promotion.unit}</span>
      </p>
      <CpButton asChild>
        <a href={guideCopy.destinations.plans}>{guideCopy.promotion.button}</a>
      </CpButton>
      <p>{guideCopy.promotion.detail}</p>
    </Card>
  );
}
export function ArticleBodyBlock({ block }: { block: ArticleBlock }) {
  switch (block.kind) {
    case 'section':
      return (
        <section className="cp-guide-section">
          <h2 id={block.id} tabIndex={-1}>
            {block.title}
          </h2>
          {block.text ? (
            <p>
              <GuideText text={block.text} mobileLines={block.mobileLines} />
            </p>
          ) : null}
        </section>
      );
    case 'checklist':
      return (
        <ul className="cp-guide-checklist">
          {block.items.map((item) => (
            <li key={item}>
              <span aria-hidden="true">{guideCopy.check}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'comparison':
      return (
        <>
          <div className="cp-guide-mobile-plans">
            {block.rows.map((row) => (
              <Card
                key={row.id}
                className="cp-guide-comparison-row"
                data-popular={row.popular || undefined}
              >
                <div>
                  {row.popular ? <p className="cp-guide-popular">{guideCopy.popular}</p> : null}
                  <h3>{row.name}</h3>
                  <p>{row.mobileDescription}</p>
                </div>
                <div className="cp-guide-comparison-price">
                  <strong>{row.price}</strong>
                  {row.storePrice ? (
                    <p>
                      <del>{row.storePrice}</del>
                      {guideCopy.inStore}
                    </p>
                  ) : (
                    <p>{row.detail}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <table className="cp-guide-comparison" aria-label={guideCopy.tableLabel}>
            <thead>
              <tr>
                {guideCopy.tableHeaders.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.id} data-popular={row.popular || undefined}>
                  <th scope="row">
                    {row.name}
                    {row.popular ? guideCopy.popularStar : null}
                  </th>
                  <td>{row.data}</td>
                  <td>
                    {row.price}
                    <p>
                      {row.storePrice ? (
                        <>
                          <del>{row.storePrice}</del>
                          {guideCopy.inStore}
                        </>
                      ) : (
                        row.detail
                      )}
                    </p>
                  </td>
                  <td>{row.desktopBestForLines?.join('\n') ?? row.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cp-guide-small">{block.note}</p>
        </>
      );
    case 'table':
      return (
        <section className="cp-guide-section">
          <h2 id={block.id} tabIndex={-1}>
            {block.title}
          </h2>
          <table className="cp-guide-table" aria-label={block.caption}>
            <caption className="sr-only">{block.caption}</caption>
            <thead>
              <tr>
                {block.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={`${row.label}-${block.columns[index + 1] ?? index}`}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cp-guide-small">{block.note}</p>
        </section>
      );
    case 'plan-cta':
      return (
        <div className="cp-guide-inline-cta">
          <div>
            <p>{block.eyebrow}</p>
            <h3>
              {block.mobileLines ? (
                <>
                  <span className="cp-guide-inline-mobile">
                    {block.mobileLines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </span>
                  <span className="cp-guide-inline-desktop">{block.text}</span>
                </>
              ) : (
                block.text
              )}
            </h3>
          </div>
          <CpButton asChild tone="sun">
            <a href={guideCopy.destinations.plans}>{block.label}</a>
          </CpButton>
        </div>
      );
    case 'devices':
      return (
        <div className="cp-guide-devices">
          {block.items.map((item) => (
            <Card key={item.id} className="cp-guide-device" data-device={item.id}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <CpImageSlot
                icon={guideAssets.imageLight}
                label={guideCopy.imageLabel}
                caption={item.caption}
                className="cp-guide-device-image"
              />
            </Card>
          ))}
        </div>
      );
    case 'steps':
      return (
        <section className="cp-guide-section cp-guide-order">
          <h2 id={block.id} tabIndex={-1}>
            {block.title}
          </h2>
          <ol>
            {block.items.map((item, index) => (
              <li key={item}>
                <span aria-hidden="true">{index + 1}</span>
                <p>{item}</p>
              </li>
            ))}
          </ol>
        </section>
      );
    case 'tip':
      return (
        <div className="cp-guide-tip">
          <strong>{block.label}</strong>
          <p>{block.text}</p>
        </div>
      );
    case 'faq':
      return (
        <section className="cp-guide-section cp-guide-faq">
          <h2 id={block.id} tabIndex={-1}>
            {block.title}
          </h2>
          <CpFaqAccordion
            items={block.items}
            name="guide-questions"
            defaultOpenId={block.items[0]?.id}
            symbols={guideCopy.symbols}
          />
        </section>
      );
  }
}
