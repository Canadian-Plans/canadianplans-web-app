import { and, sql, type SQL } from 'drizzle-orm';
import { leads } from '@canadian-plans/db';
import {
  builtInLeadFields,
  type LeadField,
  type LeadFieldFilter,
  type LeadSort,
} from '@canadian-plans/contracts';

/** Only this code-owned map chooses columns; all JSON field keys are bound parameters. */
function storedFieldJson(field: LeadField): SQL {
  if (field.origin === 'custom') return sql`${leads.customValues}->${field.key}`;
  switch (field.key) {
    case 'fullName':
      return sql`to_jsonb(${leads.fullName})`;
    case 'email':
      return sql`case when ${leads.email} is not null then jsonb_build_object('address', ${leads.email}) end`;
    case 'phone':
      return sql`case when ${leads.phone} is not null then jsonb_build_object('number', ${leads.phone}, 'countryCode', ${leads.countryCode}) end`;
    case 'countryCode':
      return sql`to_jsonb(${leads.countryCode})`;
    case 'partnerId':
      return sql`to_jsonb(${leads.partnerId})`;
    case 'selectedOfferVersionId':
      return sql`to_jsonb(${leads.selectedOfferVersionId})`;
    case 'consentVersion':
      return sql`to_jsonb(${leads.consentVersion})`;
    case 'source':
      return sql`to_jsonb(case when nullif(${leads.attribution}->>'partnerCode','') is not null then 'partner:' || (${leads.attribution}->>'partnerCode') || case when ${leads.attribution}->>'partnerCodeMatched' = 'true' then '' else ' (unmatched)' end when nullif(${leads.attribution}->>'utmSource','') is not null then 'utm:' || (${leads.attribution}->>'utmSource') || coalesce('/' || nullif(${leads.attribution}->>'utmMedium',''),'') when nullif(${leads.attribution}->>'referrerHost','') is not null then 'referrer:' || (${leads.attribution}->>'referrerHost') else 'direct' end)`;
    case 'status':
      return sql`to_jsonb(${leads.status})`;
    case 'leadType':
      return sql`to_jsonb(${leads.leadType})`;
    case 'createdAt':
      return sql`to_jsonb(to_char(${leads.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`;
    case 'updatedAt':
      return sql`to_jsonb(to_char(${leads.updatedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`;
    default: {
      const builtin = builtInLeadFields.find((f) => f.key === field.key);
      if (builtin?.source === 'column') return sql`${leads.attribution}->${field.key}`;
      if (builtin?.source === 'flow' && field.type === 'long_text')
        return sql`to_jsonb((${leads.payload}->'payload'->${field.key})::text)`;
      return sql`${leads.payload}->'payload'->${field.key}`;
    }
  }
}
export function leadFieldJson(field: LeadField): SQL {
  const raw = storedFieldJson(field);
  return field.leadTypes.length
    ? sql`case when ${leads.leadType} = any(ARRAY(select jsonb_array_elements_text(${JSON.stringify(field.leadTypes)}::jsonb))) then ${raw} end`
    : raw;
}

function validJson(field: LeadField, raw: SQL): SQL {
  return sql`app.lead_valid_value(${raw}, ${field.type}, ${JSON.stringify(field.options.map((o) => o.value))}::jsonb)`;
}
function normalizedScalar(field: LeadField, part?: LeadSort['part']): SQL {
  const raw = leadFieldJson(field);
  const valid = validJson(field, raw);
  const value = sql`case when ${valid} then ${raw} else null end`;
  if (field.type === 'phone') return sql`regexp_replace(${value}->>'number', '[^0-9]', '', 'g')`;
  if (field.type === 'email') return sql`lower(${value}->>'address')`;
  if (field.type === 'address')
    return part === 'postalCode'
      ? sql`lower(regexp_replace(${value}->>${part}, '[[:space:]-]', '', 'g'))`
      : sql`lower(${value}->>${part ?? 'city'})`;
  if (field.type === 'links') return sql`lower(${value}->0->>'url')`;
  if (field.type === 'multi_select') return sql`lower(${value}::text)`;
  const scalar = sql`app.lead_safe_scalar(${value}, ${field.type})`;
  if (field.type === 'number') return sql`(${scalar})::numeric`;
  if (field.type === 'date') return sql`(${scalar})::date`;
  if (field.type === 'datetime') return sql`(${scalar})::timestamptz`;
  return sql`lower(${scalar})`;
}
function normalizeFilter(field: LeadField, filter: LeadFieldFilter): unknown {
  if (typeof filter.value !== 'string') return filter.value;
  if (field.type === 'phone') return filter.value.replace(/\D/g, '');
  if (field.type === 'address' && filter.part === 'postalCode')
    return filter.value.replace(/[\s-]/g, '').toLowerCase();
  return filter.value.toLowerCase();
}
function escapeLike(value: unknown): string {
  return String(value).replace(/[\\%_]/g, '\\$&');
}
export function leadFilterCondition(field: LeadField, filter: LeadFieldFilter): SQL {
  const raw = leadFieldJson(field);
  const expr = normalizedScalar(field, filter.part);
  const valid = validJson(field, raw);
  const value = normalizeFilter(field, filter);
  if (
    field.type === 'links' &&
    ['eq', 'neq', 'contains', 'starts_with'].includes(filter.operator)
  ) {
    const url = sql`lower(link->>'url')`;
    const match =
      filter.operator === 'contains'
        ? sql`${url} like ${`%${escapeLike(value)}%`} escape ${'\\'}`
        : filter.operator === 'starts_with'
          ? sql`${url} like ${`${escapeLike(value)}%`} escape ${'\\'}`
          : sql`${url} = ${value}`;
    const exists = sql`exists(select 1 from jsonb_array_elements(case when ${valid} then ${raw} else '[]'::jsonb end) as link where ${match})`;
    return filter.operator === 'neq'
      ? sql`${valid} and not ${exists}`
      : sql`${valid} and ${exists}`;
  }
  switch (filter.operator) {
    case 'empty':
      return sql`(${raw} is null or ${raw} = 'null'::jsonb or (${valid} and ${expr} is null))`;
    case 'not_empty':
      return sql`${valid} and ${expr} is not null`;
    case 'has_any':
      return sql`${valid} and ${raw} ?| ARRAY(select jsonb_array_elements_text(${JSON.stringify(value)}::jsonb))`;
    case 'has_all':
      return sql`${valid} and ${raw} ?& ARRAY(select jsonb_array_elements_text(${JSON.stringify(value)}::jsonb))`;
    default: {
      let condition: SQL;
      switch (filter.operator) {
        case 'eq':
          condition = sql`${expr} = ${typeof value === 'boolean' ? String(value) : value}`;
          break;
        case 'neq':
          condition = sql`${expr} <> ${typeof value === 'boolean' ? String(value) : value}`;
          break;
        case 'gt':
          condition = sql`${expr} > ${value}`;
          break;
        case 'gte':
          condition = sql`${expr} >= ${value}`;
          break;
        case 'lt':
          condition = sql`${expr} < ${value}`;
          break;
        case 'lte':
          condition = sql`${expr} <= ${value}`;
          break;
        case 'contains':
          condition = sql`${expr} like ${`%${escapeLike(value)}%`} escape ${'\\'}`;
          break;
        case 'starts_with':
          condition = sql`${expr} like ${`${escapeLike(value)}%`} escape ${'\\'}`;
          break;
      }
      return and(valid, condition) ?? sql`false`;
    }
  }
}
export function leadSortExpression(field: LeadField, sort: LeadSort): SQL {
  const expr = normalizedScalar(field, sort.part);
  return sort.direction === 'asc' ? sql`${expr} asc nulls last` : sql`${expr} desc nulls last`;
}
