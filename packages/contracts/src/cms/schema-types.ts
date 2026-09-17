import { defineArrayMember, defineField, defineType } from 'sanity';
import type { SchemaTypeDefinition } from 'sanity';

/**
 * Shared Sanity Studio schema — the single source of truth for every
 * website's embedded Studio (PLATFORM_CONTEXT.md §6, REQ 06–09/11–12). Each
 * site keeps its own Sanity project and content (REQ 09); only this schema
 * code is shared. Browser-safe: no provider secrets or server-only SDK
 * clients (PLATFORM_CONTEXT.md §4a).
 *
 * "Document checklist" values mirror the API contract's lower_snake_case
 * slug shape (`documentChecklistKeySchema` in ../domain.ts) but are kept as
 * their own bounded CMS enum: the Studio only ever offers the checklist
 * items the business currently uses, while the API accepts any slug an
 * offer version snapshot happens to carry.
 */

export const DOCUMENT_CHECKLIST_VALUES = ['passport', 'visa', 'address_proof'] as const;
export type DocumentChecklistValue = (typeof DOCUMENT_CHECKLIST_VALUES)[number];
const DOCUMENT_CHECKLIST_VALUES_LIST: readonly string[] = DOCUMENT_CHECKLIST_VALUES;

/** Only SIM plans exist in Phase A (PLATFORM_CONTEXT.md §5); widened in Phase B. */
export const PRODUCT_TYPE_VALUES = ['sim'] as const;
export type ProductType = (typeof PRODUCT_TYPE_VALUES)[number];
const PRODUCT_TYPE_VALUES_LIST: readonly string[] = PRODUCT_TYPE_VALUES;

/** Section object types: page.sections' discriminated union member types. */
const sectionHero = defineType({
  name: 'sectionHero',
  title: 'Hero',
  type: 'object',
  fields: [
    defineField({
      name: 'schemaVersion',
      title: 'Schema version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'subheading', title: 'Subheading', type: 'string' }),
    defineField({
      name: 'backgroundImage',
      title: 'Background image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({ name: 'ctaLabel', title: 'Call-to-action label', type: 'string' }),
    defineField({ name: 'ctaHref', title: 'Call-to-action link', type: 'string' }),
  ],
  preview: { select: { title: 'heading' } },
});

const sectionRichText = defineType({
  name: 'sectionRichText',
  title: 'Rich text',
  type: 'object',
  fields: [
    defineField({
      name: 'schemaVersion',
      title: 'Schema version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: { select: { title: 'content.0.children.0.text' } },
});

const sectionPlanGrid = defineType({
  name: 'sectionPlanGrid',
  title: 'Plan grid',
  type: 'object',
  fields: [
    defineField({
      name: 'schemaVersion',
      title: 'Schema version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({
      name: 'offers',
      title: 'Offers',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'offer' }] })],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
  ],
  preview: { select: { title: 'heading' } },
});

const sectionFaq = defineType({
  name: 'sectionFaq',
  title: 'FAQ',
  type: 'object',
  fields: [
    defineField({
      name: 'schemaVersion',
      title: 'Schema version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faqItem',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'text',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'question' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: { select: { title: 'heading' } },
});

const sectionTestimonials = defineType({
  name: 'sectionTestimonials',
  title: 'Testimonials',
  type: 'object',
  fields: [
    defineField({
      name: 'schemaVersion',
      title: 'Schema version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({
      name: 'items',
      title: 'Testimonials',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'testimonialItem',
          fields: [
            defineField({
              name: 'quote',
              title: 'Quote',
              type: 'text',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'author',
              title: 'Author',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'role', title: 'Role', type: 'string' }),
            defineField({
              name: 'avatar',
              title: 'Avatar',
              type: 'image',
              options: { hotspot: true },
            }),
          ],
          preview: { select: { title: 'author', subtitle: 'quote' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: { select: { title: 'heading' } },
});

const sectionCta = defineType({
  name: 'sectionCta',
  title: 'Call to action',
  type: 'object',
  fields: [
    defineField({
      name: 'schemaVersion',
      title: 'Schema version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'body', title: 'Body', type: 'text' }),
    defineField({
      name: 'buttonLabel',
      title: 'Button label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'buttonHref',
      title: 'Button link',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { select: { title: 'heading' } },
});

const sectionImageText = defineType({
  name: 'sectionImageText',
  title: 'Image + text',
  type: 'object',
  fields: [
    defineField({
      name: 'schemaVersion',
      title: 'Schema version',
      type: 'number',
      initialValue: 1,
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    defineField({ name: 'body', title: 'Body', type: 'text' }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'imagePosition',
      title: 'Image position',
      type: 'string',
      options: { list: ['left', 'right'] },
      initialValue: 'left',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { select: { title: 'heading' } },
});

export const pageSectionTypes = [
  sectionHero,
  sectionRichText,
  sectionPlanGrid,
  sectionFaq,
  sectionTestimonials,
  sectionCta,
  sectionImageText,
] satisfies SchemaTypeDefinition[];

/** Shared page-sections array field, reused by `page` and `countryPage`. */
function sectionsField() {
  return defineField({
    name: 'sections',
    title: 'Sections',
    type: 'array',
    of: pageSectionTypes.map((sectionType) => defineArrayMember({ type: sectionType.name })),
  });
}

function seoField() {
  return defineField({
    name: 'seo',
    title: 'SEO',
    type: 'object',
    fields: [
      defineField({ name: 'title', title: 'Meta title', type: 'string' }),
      defineField({ name: 'description', title: 'Meta description', type: 'text' }),
      defineField({
        name: 'ogImage',
        title: 'Social image',
        type: 'image',
        options: { hotspot: true },
      }),
    ],
  });
}

/** Singleton: global branding, default SEO and footer content (REQ 06). */
const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'object',
      fields: seoField().fields,
    }),
    defineField({
      name: 'contactEmail',
      title: 'Contact email',
      type: 'string',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'socialLink',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'object',
      fields: [
        defineField({ name: 'text', title: 'Footer text', type: 'text' }),
        defineField({
          name: 'links',
          title: 'Footer links',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'footerLink',
              fields: [
                defineField({
                  name: 'label',
                  title: 'Label',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'href',
                  title: 'Link',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
  preview: { select: { title: 'siteName' } },
});

/** Singleton: primary navigation menu (REQ 06/07). */
const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'items',
      title: 'Menu items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'navigationItem',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'href',
              title: 'Link',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'children',
              title: 'Submenu items',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'navigationChildItem',
                  fields: [
                    defineField({
                      name: 'label',
                      title: 'Label',
                      type: 'string',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'href',
                      title: 'Link',
                      type: 'string',
                      validation: (Rule) => Rule.required(),
                    }),
                  ],
                }),
              ],
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: { select: { title: 'items.0.label' } },
});

/** Editorial page: home, plans, static marketing pages (REQ 07). */
const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    seoField(),
    sectionsField(),
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});

/** Country landing page: per-country eligibility/marketing content (REQ 07). */
const countryPage = defineType({
  name: 'countryPage',
  title: 'Country page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'countryCode',
      title: 'Country code (ISO-3166-1 alpha-2)',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .uppercase()
          .length(2)
          .regex(/^[A-Z]{2}$/, 'ISO-3166-1 alpha-2 country code'),
    }),
    seoField(),
    sectionsField(),
  ],
  preview: { select: { title: 'title', subtitle: 'countryCode' } },
});

/** Blog post (REQ 07). */
const post = defineType({
  name: 'post',
  title: 'Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text' }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'author', title: 'Author', type: 'string' }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({ type: 'block' }),
        defineArrayMember({ type: 'image', options: { hotspot: true } }),
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    seoField(),
  ],
  preview: { select: { title: 'title', subtitle: 'publishedAt' } },
});

/**
 * Product identity. `productKey` is the stable identifier that survives
 * title/slug changes (REQ 11) — the catalogue sync task (T10) keys offer
 * versions off it, not off `_id`, `title` or `slug`. Cross-document
 * uniqueness of `productKey` is not enforced here (Studio schema
 * validation cannot safely perform a live uniqueness lookup); the backend
 * sync enforces it as a database constraint (workspace, product, content
 * hash — IMPLEMENTATION_PLAN.md §6). Only `sim` exists in Phase A; Phase B
 * websites 2/3 add their own product types.
 */
const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'productKey',
      title: 'Product key',
      description: 'Stable identifier. Never change once referenced by an offer.',
      type: 'string',
      validation: (Rule) =>
        Rule.required().regex(/^[a-z0-9][a-z0-9-]*$/, 'lower-kebab-case product key'),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Product type',
      type: 'string',
      options: {
        list: PRODUCT_TYPE_VALUES.map((value) => ({ title: value.toUpperCase(), value })),
      },
      initialValue: 'sim',
      validation: (Rule) =>
        Rule.required().custom((value) =>
          typeof value === 'string' && PRODUCT_TYPE_VALUES_LIST.includes(value)
            ? true
            : `Must be one of: ${PRODUCT_TYPE_VALUES.join(', ')}`,
        ),
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'productKey' } },
});

/**
 * Offer: the commercial terms a `product` is sold under (REQ 12). Every
 * field a published offer must carry is `Rule.required()` so an incomplete
 * offer cannot be published — Studio blocks the Publish action and reports
 * every failing field. The backend's catalogue sync (T10) copies these
 * exact fields into an immutable offer version; it never invents a value
 * this schema does not already require.
 */
const offer = defineType({
  name: 'offer',
  title: 'Offer',
  type: 'document',
  fields: [
    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Offer name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'currency',
      title: 'Currency (ISO-4217)',
      type: 'string',
      initialValue: 'CAD',
      validation: (Rule) =>
        Rule.required()
          .uppercase()
          .length(3)
          .regex(/^[A-Z]{3}$/, 'ISO-4217 currency code'),
    }),
    defineField({
      name: 'recurringChargeAmountMinor',
      title: 'Recurring charge (minor units, e.g. cents)',
      description: 'Integer minor-unit amount (PLATFORM_CONTEXT.md §4). Never a float.',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'oneTimeFees',
      title: 'One-time fees',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'oneTimeFee',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'amountMinor',
              title: 'Amount (minor units)',
              type: 'number',
              validation: (Rule) => Rule.required().integer().min(0),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'amountMinor' } },
        }),
      ],
    }),
    defineField({
      name: 'amountPayableTodayMinor',
      title: 'Amount payable today (minor units)',
      description:
        'Amount the website itself collects today, distinct from any advertised carrier fee.',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'paymentRequired',
      title: 'Payment required',
      type: 'boolean',
      initialValue: false,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'documentChecklist',
      title: 'Document checklist',
      description: 'Documents the customer must upload. Leave empty for none.',
      type: 'array',
      of: [
        defineArrayMember({ type: 'string', options: { list: [...DOCUMENT_CHECKLIST_VALUES] } }),
      ],
      validation: (Rule) =>
        Rule.required()
          .unique()
          .custom((values) => {
            if (!Array.isArray(values)) return true;
            const invalid = values.filter(
              (value) =>
                typeof value !== 'string' || !DOCUMENT_CHECKLIST_VALUES_LIST.includes(value),
            );
            return invalid.length === 0
              ? true
              : `Unknown document checklist value(s): ${invalid.join(', ')}`;
          }),
    }),
    defineField({
      name: 'eligibility',
      title: 'Eligibility',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'availability',
      title: 'Availability',
      description:
        'Editorial description of where/when this offer is available (e.g. region restrictions).',
      type: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'billingParty',
      title: 'Billing party',
      description: 'Who bills the customer for this offer (e.g. Canadian Plans, the carrier).',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'contractTerms',
      title: 'Contract / promotional terms',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'termsVersion',
      title: 'Terms version',
      description: 'Stable version accepted with the quote (for example terms-2026-09).',
      type: 'string',
      validation: (Rule) => Rule.required().max(64),
    }),
    defineField({
      name: 'specs',
      title: 'Specifications',
      type: 'object',
      fields: [
        defineField({
          name: 'carrier',
          title: 'Carrier',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'dataAllowance',
          title: 'Data allowance',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField({ name: 'speed', title: 'Speed (non-SIM plans)', type: 'string' }),
        defineField({
          name: 'addressConditions',
          title: 'Address conditions (non-SIM plans)',
          type: 'string',
        }),
        defineField({ name: 'notes', title: 'Additional notes', type: 'text' }),
      ],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'currency' } },
});

/** Path redirect, editable without a code change (REQ 07). */
const redirect = defineType({
  name: 'redirect',
  title: 'Redirect',
  type: 'document',
  fields: [
    defineField({
      name: 'source',
      title: 'Source path',
      type: 'string',
      validation: (Rule) => Rule.required().regex(/^\//, 'Must start with /'),
    }),
    defineField({
      name: 'destination',
      title: 'Destination',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'permanent',
      title: 'Permanent (308) redirect',
      type: 'boolean',
      initialValue: true,
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { select: { title: 'source', subtitle: 'destination' } },
});

/** Versioned legal page (terms/privacy) — a new version supersedes, never edits, the old text. */
const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'version',
      title: 'Version',
      description:
        'Increment on every substantive change. Orders snapshot the version accepted at capture.',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: 'effectiveDate',
      title: 'Effective date',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
      validation: (Rule) => Rule.required().min(1),
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'version' } },
});

export const documentTypes = [
  siteSettings,
  navigation,
  page,
  countryPage,
  post,
  product,
  offer,
  redirect,
  legalPage,
] satisfies SchemaTypeDefinition[];

/** Full schema type list for `sanity.config.ts`'s `schema.types`. */
export const schemaTypes = [...documentTypes, ...pageSectionTypes] satisfies SchemaTypeDefinition[];

/** Singleton document type names — Studio structure should offer exactly one instance. */
export const SINGLETON_DOCUMENT_TYPES = ['siteSettings', 'navigation'] as const;
