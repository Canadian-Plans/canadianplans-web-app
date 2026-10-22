import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email';
import { emailCommon as copy } from '@content/emails';
import { emailTokens as t } from './tokens.generated';
import { emailStyles as s, emailText, px } from './styles';
import { emailAssetOrigin, type EmailResources } from './data';
import { BRAND_ICON_SRC } from '@/components/shared/brand-mark';

export function EmailSpacer({ height }: { height: number }) {
  return (
    <Row data-skip-in-text="true" aria-hidden="true">
      <Column height={height} style={{ height, fontSize: t.zero, lineHeight: px(height) }}>
        &nbsp;
      </Column>
    </Row>
  );
}
export function EmailImageSlot({ caption, origin }: { caption: string; origin: string }) {
  return (
    <Section style={s.image} data-email-section="image">
      <Row>
        <Column style={s.imageCell} align="center" valign="middle">
          <Img
            src={new URL(copy.image.src, origin).href}
            width={copy.image.width}
            height={copy.image.height}
            alt=""
            style={{ display: 'block', margin: 'auto' }}
            data-figma-asset={copy.image.nodeId}
          />
          <EmailSpacer height={t.s8} />
          <Text
            style={{
              ...emailText(t.t12, t.t12 * t.labelLeading, t.blue, t.bold),
              letterSpacing: t.imageTracking,
            }}
          >
            {copy.imageLabel}
          </Text>
          <EmailSpacer height={t.s8} />
          <Text
            style={{ ...emailText(t.t13, t.t13 * t.captionLeading, t.muted), textAlign: 'center' }}
          >
            {caption}
          </Text>
        </Column>
      </Row>
    </Section>
  );
}
export function EmailSteps({
  title,
  steps,
}: {
  title: string;
  steps: readonly { number: string; text: string }[];
}) {
  return (
    <Section style={s.steps} data-email-section="steps">
      <Row>
        <Column style={s.boxCell}>
          <Heading as="h2" style={emailText(t.t18, t.line23, t.ink, t.bold)}>
            {title}
          </Heading>
          <EmailSpacer height={t.s12} />
          {steps.map((step, index) => (
            <Section key={step.number}>
              <Row>
                <Column width={t.s28} valign="top">
                  <Section style={s.number}>
                    <Row>
                      <Column height={t.s28} align="center" valign="middle">
                        <Text style={emailText(t.t14, t.s18, t.white, t.bold)}>{step.number}</Text>
                      </Column>
                    </Row>
                  </Section>
                </Column>
                <Column width={t.s12} />
                <Column valign="top">
                  <Text style={emailText(t.t17, t.line21)}>{step.text}</Text>
                </Column>
              </Row>
              {index < steps.length - 1 && <EmailSpacer height={t.s12} />}
            </Section>
          ))}
        </Column>
      </Row>
    </Section>
  );
}
export function EmailOrderSummary({ rows }: { rows: readonly { label: string; value: string }[] }) {
  return (
    <Section style={s.summary} data-email-section="summary">
      <Row>
        <Column style={s.boxCell}>
          <Heading as="h2" style={emailText(t.t18, t.line23, t.ink, t.bold)}>
            {copy.summary}
          </Heading>
          <EmailSpacer height={t.s10} />
          {rows.map((row, index) => (
            <Section key={row.label} style={{ tableLayout: 'fixed' }}>
              <Row>
                <Column width="35%" valign="top">
                  <Text
                    style={{
                      ...emailText(t.t16, t.s20, t.muted),
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.label}
                  </Text>
                </Column>
                <Column width="65%" align="right" valign="top">
                  <Text
                    style={{
                      ...emailText(t.t16, t.s20, t.ink, t.semibold),
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.value}
                  </Text>
                </Column>
              </Row>
              {index < rows.length - 1 && <EmailSpacer height={t.s10} />}
            </Section>
          ))}
        </Column>
      </Row>
    </Section>
  );
}
export interface EmailFrameProps extends EmailResources {
  subject: string;
  preheader: string;
  title: string;
  intro: string;
  caption: string;
  stepsTitle: string;
  steps: readonly { number: string; text: string }[];
  actionLabel: string;
  actionUrl: string;
  rows: readonly { label: string; value: string }[];
  help: string;
}
export function EmailFrame(props: EmailFrameProps) {
  const origin = emailAssetOrigin(props.assetBaseUrl);
  return (
    <Html lang="en">
      <Head>
        <title>{props.subject}</title>
      </Head>
      <Preview>{props.preheader}</Preview>
      <Body style={s.body}>
        <Container style={s.outer} width={t.frameWidth}>
          <Row>
            <Column style={s.wrapper}>
              {props.previewInbox && (
                <Section data-skip-in-text="true" data-email-section="inbox">
                  <Text style={emailText(t.t15, t.line19, t.ink, t.bold)}>
                    {copy.subjectLabel} {props.subject}
                  </Text>
                  <EmailSpacer height={t.s2} />
                  <Text style={emailText(t.t14, t.s18, t.muted)}>
                    {copy.previewLabel} {props.preheader}
                  </Text>
                  <EmailSpacer height={t.s16} />
                </Section>
              )}
              <Container style={s.card} width={t.width} data-email-section="card">
                <Section>
                  <Row>
                    <Column style={s.header}>
                      <Row>
                        <Column width={t.s32} valign="middle">
                          <Img
                            src={new URL(BRAND_ICON_SRC, origin).href}
                            width={t.s32}
                            height={t.s32}
                            alt=""
                            style={{ display: 'block' }}
                          />
                        </Column>
                        <Column width={t.s10} />
                        <Column valign="middle">
                          <Text style={emailText(t.t20, t.line25, t.white, t.bold)}>
                            {copy.brand}
                          </Text>
                        </Column>
                      </Row>
                    </Column>
                  </Row>
                </Section>
                <Section>
                  <Row>
                    <Column style={s.content} data-email-section="content">
                      <EmailImageSlot caption={props.caption} origin={origin} />
                      <EmailSpacer height={t.s18} />
                      <Heading as="h1" style={emailText(t.t30, t.titleLine, t.ink, t.bold)}>
                        {props.title}
                      </Heading>
                      <EmailSpacer height={t.s18} />
                      <Text style={emailText(t.t18, t.bodyLine, t.bodyInk)}>{props.intro}</Text>
                      <EmailSpacer height={t.s18} />
                      <EmailSteps title={props.stepsTitle} steps={props.steps} />
                      <EmailSpacer height={t.s18} />
                      <Section>
                        <Row>
                          <Column>
                            <Button href={props.actionUrl} style={s.button}>
                              {props.actionLabel}
                            </Button>
                          </Column>
                        </Row>
                      </Section>
                      <EmailSpacer height={t.s18} />
                      <EmailOrderSummary rows={props.rows} />
                      <EmailSpacer height={t.s18} />
                      <Text style={emailText(t.t16, t.s20, t.muted)}>{props.help}</Text>
                    </Column>
                  </Row>
                </Section>
                <Section>
                  <Row>
                    <Column style={s.footer} data-email-section="footer">
                      {copy.footer.map((text, index) => (
                        <Section key={text}>
                          <Text style={emailText(t.t14, t.s18, t.muted)}>{text}</Text>
                          {index < copy.footer.length - 1 && <EmailSpacer height={t.s6} />}
                        </Section>
                      ))}
                    </Column>
                  </Row>
                </Section>
              </Container>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}
