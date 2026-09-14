import { z } from 'zod';

import { isoDateTimeSchema, requestIdSchema, versionedFormSchema } from './common';

/**
 * Lead capture and resume — `POST /leads`, `PATCH /leads/:id`.
 * Caller: website credential (`leads:write`) plus, on resume, a draft grant.
 * No handler here; A2 implements persistence.
 */

/**
 * Attribution captured from the landing URL. Stored in a bounded, sanitized
 * form and never forwarded raw to analytics or logs (invariant 12). Every
 * field is optional and length-capped.
 */
export const attributionSchema = z.object({
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  partnerCode: z.string().max(64).optional(),
  landingPath: z.string().max(512).optional(),
  referrerHost: z.string().max(253).optional(),
});
export type Attribution = z.infer<typeof attributionSchema>;

/** Customer contact fields. International — any country and phone format is accepted (§7). */
export const leadContactSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  email: z.email().max(254).optional(),
  phone: z.string().max(32).optional(),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
});
export type LeadContact = z.infer<typeof leadContactSchema>;

/**
 * The in-progress plan-specific form, versioned so a website can migrate its
 * form schema independently. The concrete `payload` shape is a per-offer Zod
 * schema defined in A2; the contract fixes only the versioning envelope.
 */
export const leadFormSchema = versionedFormSchema(z.record(z.string(), z.unknown()));
export type LeadForm = z.infer<typeof leadFormSchema>;

export const leadStatusSchema = z.enum(['draft', 'converted', 'abandoned']);
export type LeadStatus = z.infer<typeof leadStatusSchema>;

export const leadSummarySchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  status: leadStatusSchema,
  updatedAt: isoDateTimeSchema,
});
export type LeadSummary = z.infer<typeof leadSummarySchema>;

/**
 * A scoped grant that lets one anonymous visitor resume their own draft
 * (glossary). Opaque token plus expiry; scoped to workspace + lead server-side.
 */
export const draftGrantSchema = z.object({
  token: z.string().min(1),
  expiresAt: isoDateTimeSchema,
});
export type DraftGrant = z.infer<typeof draftGrantSchema>;

export const createLeadRequestSchema = z.object({
  attribution: attributionSchema.optional(),
  contact: leadContactSchema.optional(),
  form: leadFormSchema.optional(),
  productId: z.uuid().optional(),
});
export type CreateLeadRequest = z.infer<typeof createLeadRequestSchema>;

export const createLeadResponseSchema = z.object({
  lead: leadSummarySchema,
  draftGrant: draftGrantSchema,
  requestId: requestIdSchema,
});
export type CreateLeadResponse = z.infer<typeof createLeadResponseSchema>;

export const updateLeadRequestSchema = z.object({
  contact: leadContactSchema.optional(),
  form: leadFormSchema.optional(),
  attribution: attributionSchema.optional(),
});
export type UpdateLeadRequest = z.infer<typeof updateLeadRequestSchema>;

export const updateLeadResponseSchema = z.object({
  lead: leadSummarySchema,
  requestId: requestIdSchema,
});
export type UpdateLeadResponse = z.infer<typeof updateLeadResponseSchema>;
