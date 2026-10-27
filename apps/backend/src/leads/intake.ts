import { eq, and } from 'drizzle-orm';
import { offerVersions, type TenantTransaction } from '@canadian-plans/db';
import {
  applyLeadFieldEdits,
  builtInLeadFields,
  fieldApplies,
  inferLeadType,
  leadFlowSchemas,
  LeadFieldValidationError,
  type LeadForm,
  type LeadType,
} from '@canadian-plans/contracts';
import { formValues, loadLeadFields, recordSchema } from './model.js';

/** Runs only after a model lock and (for resume) a validated, locked draft grant. */
export async function prepareLeadIntake(
  tx: TenantTransaction,
  input: {
    workspaceId: string;
    leadType?: LeadType;
    form?: LeadForm;
    customValues?: Record<string, unknown>;
    selectedOfferVersionId?: string | null;
    previousForm?: unknown;
    previousCustom?: unknown;
    previousType?: LeadType;
  },
): Promise<{
  leadType: LeadType;
  form: LeadForm | null;
  customValues: Record<string, unknown>;
  changedKeys: string[];
}> {
  const fields = await loadLeadFields(tx, input.workspaceId);
  const oldForm = formValues(input.previousForm);
  const incoming = input.form?.payload;
  let offerType: unknown;
  if (input.selectedOfferVersionId) {
    const [offer] = await tx
      .select({ content: offerVersions.content })
      .from(offerVersions)
      .where(
        and(
          eq(offerVersions.workspaceId, input.workspaceId),
          eq(offerVersions.id, input.selectedOfferVersionId),
        ),
      );
    offerType = recordSchema.safeParse(offer?.content).data?.['productType'];
  }
  const inferred = inferLeadType(incoming ?? oldForm, offerType);
  if (input.leadType && inferred !== 'legacy' && input.leadType !== inferred)
    throw new LeadFieldValidationError();
  const leadType =
    input.leadType ?? (inferred !== 'legacy' ? inferred : (input.previousType ?? 'legacy'));
  const previousCustom = recordSchema.parse(input.previousCustom ?? {});
  const edits = { ...input.customValues };
  const form = { ...oldForm };
  const changedKeys: string[] = [];
  if (input.form && input.form.schemaVersion !== 1) throw new LeadFieldValidationError();
  for (const [key, value] of Object.entries(incoming ?? {})) {
    const field = fields.find((f) => f.key === key);
    const builtin = builtInLeadFields.find((f) => f.key === key);
    if (field?.origin === 'custom') {
      if (Object.hasOwn(oldForm, key) && JSON.stringify(oldForm[key]) === JSON.stringify(value))
        continue;
      if (Object.hasOwn(edits, key)) throw new LeadFieldValidationError();
      edits[key] = value;
      continue;
    }
    if (
      !builtin ||
      builtin.source === 'column' ||
      !field ||
      !field.websiteAccepted ||
      !fieldApplies(field, leadType)
    ) {
      // Old unknown answers may survive untouched; callers cannot add or edit them.
      if (!Object.hasOwn(oldForm, key) || JSON.stringify(oldForm[key]) !== JSON.stringify(value))
        throw new LeadFieldValidationError();
      continue;
    }
    const flow = leadFlowSchemas[key];
    if (flow) {
      const parsed = flow.safeParse(value);
      if (!parsed.success) throw new LeadFieldValidationError();
      form[key] = parsed.data;
    } else {
      const result = applyLeadFieldEdits({
        fields: [field],
        leadType,
        current: form,
        edits: { [key]: value },
        audience: 'website',
      });
      if (Object.hasOwn(result.values, key)) form[key] = result.values[key];
      else delete form[key];
    }
    if (JSON.stringify(oldForm[key]) !== JSON.stringify(form[key])) changedKeys.push(key);
  }
  if (input.form && leadType === 'sim') delete form['category'];
  // Only custom definitions may be addressed through the custom-values envelope.
  if (Object.keys(edits).some((key) => !fields.some((f) => f.key === key && f.origin === 'custom')))
    throw new LeadFieldValidationError();
  const custom = applyLeadFieldEdits({
    fields,
    leadType,
    current: previousCustom,
    edits,
    audience: 'website',
  });
  return {
    leadType,
    form: input.form
      ? { schemaVersion: 1, payload: form }
      : input.previousForm
        ? { schemaVersion: 1, payload: oldForm }
        : null,
    customValues: custom.values,
    changedKeys: [...changedKeys, ...custom.changedKeys],
  };
}
