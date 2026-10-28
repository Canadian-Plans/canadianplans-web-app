import { z } from 'zod';
import { leadTypes } from '@canadian-plans/types';
import { isoDateTimeSchema, pageInfoSchema, requestIdSchema } from './common';

export const leadTypeSchema = z.enum(leadTypes);
export type LeadType = z.infer<typeof leadTypeSchema>;
export const leadTypeLabels: Record<LeadType, string> = {
  sim: 'Pre-arrival SIM',
  mobile: 'Mobile',
  internet: 'Internet',
  legacy: 'Legacy lead',
};
const shortText = (max: number) => z.string().trim().min(1).max(max);
export const leadPhoneSchema = z
  .object({
    number: shortText(32).regex(/^\+?[0-9 ()-]{5,32}$/),
    countryCode: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();
export const leadEmailSchema = z.object({ address: z.email().max(254) }).strict();
export const leadAddressSchema = z
  .object({
    street: shortText(200),
    unit: shortText(40).optional(),
    city: shortText(80),
    province: shortText(80).optional(),
    postalCode: shortText(20),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .strict();
export const leadLinksSchema = z
  .array(
    z
      .object({
        url: z.url({ protocol: /^https?$/ }).max(2048),
        label: shortText(80).optional(),
      })
      .strict(),
  )
  .min(1)
  .max(10);

/** Adding a type starts here: its validator, label and query operators travel together. */
export const leadFieldTypes = {
  text: {
    label: 'Text',
    schema: shortText(500),
    operators: ['eq', 'neq', 'contains', 'starts_with', 'empty', 'not_empty'],
  },
  long_text: {
    label: 'Long text',
    schema: shortText(10000),
    operators: ['eq', 'neq', 'contains', 'starts_with', 'empty', 'not_empty'],
  },
  number: {
    label: 'Number',
    schema: z.number().finite().min(-1e12).max(1e12),
    operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'],
  },
  boolean: { label: 'Yes/no', schema: z.boolean(), operators: ['eq', 'neq', 'empty', 'not_empty'] },
  date: {
    label: 'Date',
    schema: z.iso.date(),
    operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'],
  },
  datetime: {
    label: 'Date and time',
    schema: z.iso.datetime(),
    operators: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'],
  },
  select: {
    label: 'Select',
    schema: shortText(64),
    operators: ['eq', 'neq', 'empty', 'not_empty'],
  },
  multi_select: {
    label: 'Multi-select',
    schema: z.array(shortText(64)).min(1).max(50),
    operators: ['has_any', 'has_all', 'empty', 'not_empty'],
  },
  phone: {
    label: 'Phone',
    schema: leadPhoneSchema,
    operators: ['eq', 'neq', 'contains', 'starts_with', 'empty', 'not_empty'],
  },
  email: {
    label: 'Email',
    schema: leadEmailSchema,
    operators: ['eq', 'neq', 'contains', 'starts_with', 'empty', 'not_empty'],
  },
  address: {
    label: 'Address',
    schema: leadAddressSchema,
    operators: ['eq', 'neq', 'contains', 'starts_with', 'empty', 'not_empty'],
  },
  links: {
    label: 'Links',
    schema: leadLinksSchema,
    operators: ['eq', 'neq', 'contains', 'starts_with', 'empty', 'not_empty'],
  },
} as const;
export const leadFieldTypeSchema = z.enum(
  Object.keys(leadFieldTypes).filter((key): key is keyof typeof leadFieldTypes =>
    Object.hasOwn(leadFieldTypes, key),
  ),
);
export type LeadFieldType = z.infer<typeof leadFieldTypeSchema>;
export const fieldKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/);
export const fieldIconSchema = z.enum([
  'text',
  'hash',
  'calendar',
  'check',
  'list',
  'phone',
  'mail',
  'map',
  'link',
  'user',
  'shield',
]);
export const fieldOptionSchema = z
  .object({
    value: shortText(64).regex(/^[a-zA-Z0-9_-]+$/),
    label: shortText(80),
    colour: z.enum(['gray', 'blue', 'green', 'yellow', 'orange', 'red', 'purple']).default('gray'),
    hidden: z.boolean().default(false),
  })
  .strict();
export type FieldOption = z.infer<typeof fieldOptionSchema>;
const fieldProperties = {
  label: shortText(80),
  description: z.string().max(500).default(''),
  icon: fieldIconSchema.default('text'),
  type: leadFieldTypeSchema,
  options: z.array(fieldOptionSchema).max(100).default([]),
  active: z.boolean().default(true),
  leadTypes: z.array(leadTypeSchema).max(leadTypes.length).default([]),
  sensitive: z.boolean().default(false),
  websiteAccepted: z.boolean().default(false),
  staffEditable: z.boolean().default(true),
};
export const createLeadFieldSchema = z
  .object(fieldProperties)
  .strict()
  .superRefine((field, ctx) => {
    if (
      new Set(field.options.map((o) => o.value)).size !== field.options.length ||
      new Set(field.leadTypes).size !== field.leadTypes.length ||
      (field.type === 'select' || field.type === 'multi_select'
        ? field.options.length === 0
        : field.options.length !== 0)
    ) {
      ctx.addIssue({ code: 'custom', message: 'Invalid field options.' });
    }
  });
export type CreateLeadField = z.infer<typeof createLeadFieldSchema>;
export const leadFieldSchema = z.object({
  ...fieldProperties,
  id: z.uuid(),
  key: fieldKeySchema,
  origin: z.enum(['builtin', 'custom']),
  version: z.int().positive(),
  createdBy: z.uuid().nullable(),
  updatedBy: z.uuid().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type LeadField = z.infer<typeof leadFieldSchema>;
export const updateLeadFieldSchema = z
  .object({
    label: fieldProperties.label.optional(),
    description: z.string().max(500).optional(),
    icon: fieldIconSchema.optional(),
    options: z.array(fieldOptionSchema).max(100).optional(),
    active: z.boolean().optional(),
    leadTypes: fieldProperties.leadTypes.optional(),
    sensitive: z.boolean().optional(),
    websiteAccepted: z.boolean().optional(),
    staffEditable: z.boolean().optional(),
    expectedVersion: z.int().positive(),
  })
  .strict();
export type UpdateLeadField = z.infer<typeof updateLeadFieldSchema>;
export interface BuiltInLeadField extends CreateLeadField {
  key: string;
  source: 'column' | 'form' | 'flow';
}
const builtin = (
  key: string,
  label: string,
  type: LeadFieldType,
  extra: Partial<CreateLeadField> & { source?: BuiltInLeadField['source'] } = {},
): BuiltInLeadField => ({
  key,
  label,
  type,
  source: 'form',
  description: '',
  icon: 'text',
  options: [],
  active: true,
  leadTypes: [],
  sensitive: false,
  websiteAccepted: true,
  staffEditable: true,
  ...extra,
});
const options = (values: readonly string[]): FieldOption[] =>
  values.map((value) => ({
    value,
    label: value.replaceAll('_', ' '),
    colour: 'gray',
    hidden: false,
  }));
export const builtInLeadFields: readonly BuiltInLeadField[] = [
  builtin('leadType', 'Lead type', 'select', {
    source: 'column',
    staffEditable: false,
    websiteAccepted: false,
    icon: 'list',
    options: leadTypes.map((value) => ({
      value,
      label: leadTypeLabels[value],
      colour: 'gray',
      hidden: false,
    })),
  }),
  builtin('fullName', 'Full name', 'text', { source: 'column', icon: 'user' }),
  builtin('email', 'Email', 'email', { source: 'column', icon: 'mail' }),
  builtin('phone', 'Phone', 'phone', { source: 'column', icon: 'phone' }),
  builtin('countryCode', 'Country code', 'text', { source: 'column', staffEditable: false }),
  builtin('status', 'Status', 'select', {
    source: 'column',
    websiteAccepted: false,
    staffEditable: false,
    options: options(['incomplete', 'submitted']),
  }),
  builtin('createdAt', 'Created', 'datetime', {
    source: 'column',
    websiteAccepted: false,
    staffEditable: false,
    icon: 'calendar',
  }),
  builtin('updatedAt', 'Updated', 'datetime', {
    source: 'column',
    websiteAccepted: false,
    staffEditable: false,
    icon: 'calendar',
  }),
  ...(
    [
      'partnerId',
      'selectedOfferVersionId',
      'consentVersion',
      'source',
      'utmSource',
      'utmMedium',
      'utmCampaign',
      'utmTerm',
      'utmContent',
      'partnerCode',
      'landingPath',
      'referrerHost',
    ] as const
  ).map((key) =>
    builtin(
      key,
      {
        partnerId: 'Partner reference',
        selectedOfferVersionId: 'Selected offer reference',
        consentVersion: 'Consent version',
        source: 'Source',
        utmSource: 'UTM source',
        utmMedium: 'UTM medium',
        utmCampaign: 'UTM campaign',
        utmTerm: 'UTM term',
        utmContent: 'UTM content',
        partnerCode: 'Partner code',
        landingPath: 'Landing path',
        referrerHost: 'Referrer host',
      }[key],
      key === 'landingPath' ? 'long_text' : 'text',
      { source: 'column', staffEditable: false, websiteAccepted: false },
    ),
  ),
  builtin('partnerCodeMatched', 'Partner code matched', 'boolean', {
    source: 'column',
    staffEditable: false,
    websiteAccepted: false,
  }),
  builtin('currentCountry', 'Current country', 'text', { leadTypes: ['sim'] }),
  builtin('destination', 'Destination', 'text', { leadTypes: ['sim'] }),
  builtin('arrivalDate', 'Arrival date', 'date', { leadTypes: ['sim'], icon: 'calendar' }),
  builtin('province', 'Province', 'text', { leadTypes: ['internet'], staffEditable: false }),
  builtin('dateOfBirth', 'Date of birth', 'date', {
    leadTypes: ['internet'],
    sensitive: true,
    icon: 'shield',
  }),
  builtin('address', 'Address', 'address', { leadTypes: ['mobile', 'internet'], icon: 'map' }),
  builtin('currentProvider', 'Current provider', 'text', { leadTypes: ['mobile', 'internet'] }),
  builtin('preferredInstallationTime', 'Preferred installation time', 'text', {
    leadTypes: ['internet'],
  }),
  builtin('lines', 'Lines', 'number', {
    leadTypes: ['mobile'],
    staffEditable: false,
    icon: 'hash',
  }),
  builtin('keepNumber', 'Keep number', 'boolean', { leadTypes: ['mobile'], icon: 'check' }),
  builtin('simType', 'SIM type', 'select', {
    leadTypes: ['mobile'],
    options: options(['esim', 'physical']),
  }),
  builtin('category', 'Form category', 'select', {
    source: 'flow',
    staffEditable: false,
    options: options(['sim', 'mobile', 'internet']),
  }),
  builtin('documents', 'Documents acknowledgement', 'long_text', {
    source: 'flow',
    staffEditable: false,
    sensitive: true,
    icon: 'shield',
  }),
  builtin('creditCheck', 'Credit check consent', 'long_text', {
    source: 'flow',
    staffEditable: false,
    sensitive: true,
    leadTypes: ['mobile'],
    icon: 'shield',
  }),
  builtin('callbackRequested', 'Callback requested', 'boolean', {
    source: 'flow',
    staffEditable: false,
  }),
];

export function fieldApplies(field: Pick<LeadField, 'leadTypes'>, type: LeadType): boolean {
  return field.leadTypes.length === 0 || field.leadTypes.includes(type);
}
export function generateLeadFieldKey(label: string, reserved: ReadonlySet<string>): string {
  const base = `custom_${
    label
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 55) || 'field'
  }`;
  let key = base;
  for (let suffix = 2; reserved.has(key); suffix += 1) key = `${base}_${suffix}`;
  return key;
}
export class LeadFieldValidationError extends Error {
  constructor() {
    super('Invalid lead field operation.');
  }
}
/** Generic failure deliberately contains neither the supplied key nor its value. */
export function parseLeadFieldValue(
  field: Pick<LeadField, 'type' | 'options'>,
  value: unknown,
  allowHidden = false,
): unknown {
  const parsed = leadFieldTypes[field.type].schema.safeParse(value);
  if (!parsed.success) throw new LeadFieldValidationError();
  const data = parsed.data;
  if (field.type === 'select' || field.type === 'multi_select') {
    const values: unknown[] = Array.isArray(data) ? data : [data];
    if (
      new Set(values).size !== values.length ||
      values.some((v) => !field.options.some((o) => o.value === v && (allowHidden || !o.hidden)))
    )
      throw new LeadFieldValidationError();
  }
  if (field.type === 'email') {
    const email = leadEmailSchema.parse(data);
    return { address: email.address.toLowerCase() };
  }
  if (field.type === 'phone') {
    const phone = leadPhoneSchema.parse(data);
    return { ...phone, number: phone.number.replace(/[ ()-]/g, '') };
  }
  return data;
}
export const leadFieldEditsSchema = z
  .object({
    expectedVersion: z.int().positive(),
    values: z.record(fieldKeySchema, z.unknown()).refine((v) => Object.keys(v).length <= 100),
  })
  .strict();
export type LeadFieldEdits = z.infer<typeof leadFieldEditsSchema>;
export function applyLeadFieldEdits(input: {
  fields: readonly LeadField[];
  leadType: LeadType;
  current: Record<string, unknown>;
  edits: Record<string, unknown>;
  audience: 'staff' | 'website';
}): { values: Record<string, unknown>; changedKeys: string[] } {
  const values = { ...input.current };
  const changedKeys: string[] = [];
  for (const [key, value] of Object.entries(input.edits)) {
    const field = input.fields.find((f) => f.key === key);
    if (
      !field ||
      !fieldApplies(field, input.leadType) ||
      (input.audience === 'staff'
        ? !field.active || !field.staffEditable
        : !field.websiteAccepted || (field.origin === 'custom' && !field.active))
    )
      throw new LeadFieldValidationError();
    if (value === null) {
      if (Object.hasOwn(values, key)) {
        delete values[key];
        changedKeys.push(key);
      }
      continue;
    }
    const parsed = parseLeadFieldValue(
      field,
      value,
      JSON.stringify(value) === JSON.stringify(values[key]),
    );
    if (JSON.stringify(values[key]) !== JSON.stringify(parsed)) {
      values[key] = parsed;
      changedKeys.push(key);
    }
  }
  return { values, changedKeys };
}

export const fieldFilterSchema = z
  .object({
    key: fieldKeySchema,
    operator: z.enum([
      'eq',
      'neq',
      'contains',
      'starts_with',
      'gt',
      'gte',
      'lt',
      'lte',
      'has_any',
      'has_all',
      'empty',
      'not_empty',
    ]),
    part: z.enum(['city', 'province', 'postalCode', 'country']).optional(),
    value: z
      .union([
        z.string().max(10000),
        z.number().finite().min(-1e12).max(1e12),
        z.boolean(),
        z.array(shortText(64)).min(1).max(50),
      ])
      .optional(),
  })
  .strict();
export type LeadFieldFilter = z.infer<typeof fieldFilterSchema>;
export const leadSortSchema = z
  .object({
    key: fieldKeySchema,
    direction: z.enum(['asc', 'desc']),
    part: fieldFilterSchema.shape.part,
  })
  .strict();
export type LeadSort = z.infer<typeof leadSortSchema>;
export const leadViewStateSchema = z
  .object({
    leadType: leadTypeSchema.optional(),
    status: z.enum(['incomplete', 'submitted']).optional(),
    columns: z
      .array(fieldKeySchema)
      .max(12)
      .refine((keys) => new Set(keys).size === keys.length),
    filters: z.array(fieldFilterSchema).max(10),
    sort: leadSortSchema.optional(),
  })
  .strict();
export type LeadViewState = z.infer<typeof leadViewStateSchema>;
export const leadSearchSchema = leadViewStateSchema.extend({
  page: z.int().min(1).max(100000).default(1),
  pageSize: z.int().min(1).max(200).default(25),
});
export type LeadSearch = z.infer<typeof leadSearchSchema>;
export function validateLeadQuery(
  state: LeadViewState,
  fields: readonly LeadField[],
  canReadPersonal: boolean,
): void {
  if (!canReadPersonal && (state.columns.length || state.filters.length || state.sort))
    throw new LeadFieldValidationError();
  const find = (key: string) => {
    const field = fields.find(
      (f) =>
        f.key === key &&
        f.active &&
        !f.sensitive &&
        (!state.leadType || fieldApplies(f, state.leadType)),
    );
    if (!field) throw new LeadFieldValidationError();
    return field;
  };
  state.columns.forEach(find);
  if (state.sort) {
    const f = find(state.sort.key);
    if ((f.type === 'address') !== Boolean(state.sort.part)) throw new LeadFieldValidationError();
  }
  for (const filter of state.filters) {
    const field = find(filter.key);
    const allowed: readonly string[] = leadFieldTypes[field.type].operators;
    if (!allowed.includes(filter.operator) || (field.type === 'address') !== Boolean(filter.part))
      throw new LeadFieldValidationError();
    if (filter.operator === 'empty' || filter.operator === 'not_empty') {
      if (filter.value !== undefined) throw new LeadFieldValidationError();
    } else if (['phone', 'email', 'address', 'links'].includes(field.type)) {
      if (
        typeof filter.value !== 'string' ||
        !filter.value.trim() ||
        filter.value.length > 2048 ||
        (field.type === 'phone' && !/\d/.test(filter.value))
      )
        throw new LeadFieldValidationError();
    } else {
      parseLeadFieldValue(field, filter.value, true);
    }
  }
}
export const leadLayoutSchema = z
  .object({
    sections: z
      .array(
        z
          .object({
            id: fieldKeySchema,
            label: shortText(80),
            fields: z.array(fieldKeySchema).max(200),
          })
          .strict(),
      )
      .max(20),
  })
  .strict()
  .superRefine((layout, ctx) => {
    const fields = layout.sections.flatMap((s) => s.fields);
    if (
      fields.length > 200 ||
      new Set(fields).size !== fields.length ||
      new Set(layout.sections.map((s) => s.id)).size !== layout.sections.length
    )
      ctx.addIssue({ code: 'custom', message: 'Use each section and field once.' });
  });
export type LeadLayout = z.infer<typeof leadLayoutSchema>;
export const leadObjectSettingsSchema = z
  .object({ name: shortText(80), defaultSort: leadSortSchema })
  .strict();
export type LeadObjectSettings = z.infer<typeof leadObjectSettingsSchema>;
export const leadFieldsResponseSchema = z.object({
  fields: z.array(leadFieldSchema).max(200),
  requestId: requestIdSchema,
});
export const leadFieldResponseSchema = z.object({
  field: leadFieldSchema,
  requestId: requestIdSchema,
});
export const leadModelResponseSchema = z.object({
  fields: z.array(leadFieldSchema).max(200),
  settings: leadObjectSettingsSchema,
  layouts: z.record(leadTypeSchema, leadLayoutSchema),
  capabilities: z.object({
    canReadPersonal: z.boolean(),
    canEdit: z.boolean(),
    canManageDataModel: z.boolean(),
  }),
  requestId: requestIdSchema,
});
export type LeadModelResponse = z.infer<typeof leadModelResponseSchema>;
export const leadSettingsResponseSchema = z.object({
  settings: leadObjectSettingsSchema,
  requestId: requestIdSchema,
});
export const leadLayoutResponseSchema = z.object({
  layout: leadLayoutSchema,
  requestId: requestIdSchema,
});
export const leadOperationResponseSchema = z.object({
  ok: z.literal(true),
  requestId: requestIdSchema,
});
export const leadRecordSchema = z.object({
  id: z.uuid(),
  leadType: leadTypeSchema,
  status: z.enum(['incomplete', 'submitted']),
  version: z.int().positive(),
  updatedAt: isoDateTimeSchema,
  fields: z.record(fieldKeySchema, z.unknown()),
});
export type LeadRecord = z.infer<typeof leadRecordSchema>;
export const leadSearchResponseSchema = z.object({
  leads: z.array(leadRecordSchema),
  page: pageInfoSchema,
  requestId: requestIdSchema,
});
export type LeadSearchResponse = z.infer<typeof leadSearchResponseSchema>;
export const leadDetailResponseSchema = z.object({
  lead: leadRecordSchema,
  legacy: z.array(z.object({ key: z.string(), label: z.string(), value: z.unknown() })),
  history: z.array(
    z.object({
      id: z.uuid(),
      actorId: z.uuid().nullable(),
      action: z.string(),
      at: isoDateTimeSchema,
      fields: z.array(z.object({ key: fieldKeySchema, label: z.string() })),
    }),
  ),
  requestId: requestIdSchema,
});
export type LeadDetailResponse = z.infer<typeof leadDetailResponseSchema>;
export const writeLeadViewSchema = z
  .object({
    name: shortText(60),
    state: leadViewStateSchema,
    expectedVersion: z.int().positive().optional(),
  })
  .strict();
export type WriteLeadView = z.infer<typeof writeLeadViewSchema>;
export const leadViewSchema = z.object({
  id: z.uuid(),
  name: shortText(60),
  state: leadViewStateSchema,
  version: z.int().positive(),
});
export type LeadView = z.infer<typeof leadViewSchema>;
export const leadViewsResponseSchema = z.object({
  views: z.array(leadViewSchema).max(30),
  requestId: requestIdSchema,
});
export const leadViewResponseSchema = z.object({
  view: leadViewSchema,
  requestId: requestIdSchema,
});
export const dataModelGrantSchema = z.object({ allowed: z.boolean() }).strict();
export const dataModelMembersResponseSchema = z.object({
  members: z.array(z.object({ id: z.uuid(), label: z.string(), allowed: z.boolean() })).max(200),
  requestId: requestIdSchema,
});

/** Flow values are bounded code-owned metadata, not staff-defined JSON fields. */
export const leadFlowSchemas: Record<string, z.ZodType> = {
  category: z.enum(['sim', 'mobile', 'internet']),
  documents: z
    .object({ required: z.array(shortText(80)).max(30), acknowledged: z.boolean() })
    .strict(),
  creditCheck: z.object({ consent: z.boolean(), version: shortText(64) }).strict(),
  callbackRequested: z.boolean(),
};
export function inferLeadType(
  form: Record<string, unknown> | undefined,
  offerType?: unknown,
): LeadType {
  const category = leadTypeSchema.safeParse(form?.['category']);
  if (category.success && category.data !== 'legacy') return category.data;
  const offer = leadTypeSchema.safeParse(offerType);
  if (offer.success && offer.data !== 'legacy') return offer.data;
  if (form && ['currentCountry', 'destination', 'arrivalDate'].some((k) => Object.hasOwn(form, k)))
    return 'sim';
  return 'legacy';
}
