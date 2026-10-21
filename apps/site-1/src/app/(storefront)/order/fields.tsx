import { FormField, Input, NativeSelect } from '@canadian-plans/ui';
import { provinceCodeSchema, provinceNames, type ProvinceCode } from '@canadian-plans/contracts';

import {
  KEEP_NUMBER_OPTIONS,
  MAX_LINES,
  MIN_LINES,
  MOBILE_PROVIDERS,
  SIM_TYPE_OPTIONS,
  orderFormContent,
} from '@content/order-forms';

import type {
  ArrivalDetails,
  InternetDetails,
  MobileDetails,
  OrderDetailField,
  OrderFieldErrors,
} from './details';

/** The element each field renders, so the error summary can link straight to it. */
export const FIELD_IDS: Readonly<Record<OrderDetailField, string>> = {
  fullName: 'order-full-name',
  email: 'order-email',
  phone: 'order-phone',
  countryCode: 'order-country-code',
  currentCountry: 'order-current-country',
  destination: 'order-destination',
  arrivalDate: 'order-arrival-date',
  province: 'order-province',
  dateOfBirth: 'order-date-of-birth',
  streetAddress: 'order-street-address',
  aptUnit: 'order-apt-unit',
  city: 'order-city',
  postalCode: 'order-postal-code',
  currentProvider: 'order-current-provider',
  preferredInstallationTime: 'order-installation-time',
  lines: 'order-lines',
  keepNumber: 'order-keep-number',
  simType: 'order-sim-type',
  creditCheckConsent: 'order-credit-check-consent',
  terms: 'order-terms',
  marketing: 'order-marketing',
};

const f = orderFormContent.fields;

interface FieldsProps<T> {
  details: T;
  errors: OrderFieldErrors;
  onChange: (patch: Partial<T>) => void;
}

interface ContactValues {
  fullName: string;
  email: string;
  phone: string;
}

/** Contact fields the two Canadian-resident forms share. */
function ContactFields({
  details,
  errors,
  onChange,
  phoneAutoComplete = 'tel',
}: FieldsProps<ContactValues> & { phoneAutoComplete?: string }) {
  return (
    <>
      <FormField id={FIELD_IDS.fullName} label={f.fullName.label} required error={errors.fullName}>
        <Input
          value={details.fullName}
          onChange={(event) => onChange({ fullName: event.target.value })}
          autoComplete="name"
        />
      </FormField>
      <FormField id={FIELD_IDS.email} label={f.email.label} required error={errors.email}>
        <Input
          type="email"
          value={details.email}
          onChange={(event) => onChange({ email: event.target.value })}
          autoComplete="email"
        />
      </FormField>
      <FormField id={FIELD_IDS.phone} label={f.phone.label} required error={errors.phone}>
        <Input
          type="tel"
          value={details.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
          autoComplete={phoneAutoComplete}
        />
      </FormField>
    </>
  );
}

interface AddressValues {
  streetAddress: string;
  aptUnit: string;
  city: string;
  postalCode: string;
}

/** Street, unit, city and postal code, shared by the two Canadian-resident forms. */
function AddressFields({ details, errors, onChange }: FieldsProps<AddressValues>) {
  return (
    <>
      <FormField
        id={FIELD_IDS.streetAddress}
        label={f.streetAddress.label}
        required
        error={errors.streetAddress}
      >
        <Input
          value={details.streetAddress}
          onChange={(event) => onChange({ streetAddress: event.target.value })}
          autoComplete="address-line1"
        />
      </FormField>
      <FormField id={FIELD_IDS.aptUnit} label={f.aptUnit.label} error={errors.aptUnit}>
        <Input
          value={details.aptUnit}
          onChange={(event) => onChange({ aptUnit: event.target.value })}
          autoComplete="address-line2"
        />
      </FormField>
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[12rem] flex-1">
          <FormField id={FIELD_IDS.city} label={f.city.label} required error={errors.city}>
            <Input
              value={details.city}
              onChange={(event) => onChange({ city: event.target.value })}
              autoComplete="address-level2"
            />
          </FormField>
        </div>
        <div className="w-40">
          <FormField
            id={FIELD_IDS.postalCode}
            label={f.postalCode.label}
            required
            hint={f.postalCode.hint}
            error={errors.postalCode}
          >
            <Input
              value={details.postalCode}
              onChange={(event) => onChange({ postalCode: event.target.value })}
              autoComplete="postal-code"
              maxLength={10}
            />
          </FormField>
        </div>
      </div>
    </>
  );
}

/** Pre-arrival eSIM: the customer is usually outside Canada. */
export function ArrivalFields({ details, errors, onChange }: FieldsProps<ArrivalDetails>) {
  return (
    <>
      <FormField id={FIELD_IDS.fullName} label={f.fullName.label} required error={errors.fullName}>
        <Input
          value={details.fullName}
          onChange={(event) => onChange({ fullName: event.target.value })}
          autoComplete="name"
        />
      </FormField>
      <FormField id={FIELD_IDS.email} label={f.email.label} required error={errors.email}>
        <Input
          type="email"
          value={details.email}
          onChange={(event) => onChange({ email: event.target.value })}
          autoComplete="email"
        />
      </FormField>
      <div className="flex flex-wrap gap-4">
        <div className="w-28">
          <FormField
            id={FIELD_IDS.countryCode}
            label={f.countryCode.label}
            required
            hint={f.countryCode.hint}
            error={errors.countryCode}
          >
            <Input
              value={details.countryCode}
              onChange={(event) => onChange({ countryCode: event.target.value.toUpperCase() })}
              autoComplete="country"
              maxLength={2}
            />
          </FormField>
        </div>
        <div className="min-w-[12rem] flex-1">
          <FormField id={FIELD_IDS.phone} label={f.phone.label} required error={errors.phone}>
            <Input
              type="tel"
              value={details.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              autoComplete="tel"
            />
          </FormField>
        </div>
      </div>
      <FormField
        id={FIELD_IDS.currentCountry}
        label={f.currentCountry.label}
        required
        error={errors.currentCountry}
      >
        <Input
          value={details.currentCountry}
          onChange={(event) => onChange({ currentCountry: event.target.value })}
          autoComplete="country-name"
        />
      </FormField>
      <FormField
        id={FIELD_IDS.destination}
        label={f.destination.label}
        required
        error={errors.destination}
      >
        <Input
          value={details.destination}
          onChange={(event) => onChange({ destination: event.target.value })}
          autoComplete="address-level2"
        />
      </FormField>
      <FormField
        id={FIELD_IDS.arrivalDate}
        label={f.arrivalDate.label}
        required
        error={errors.arrivalDate}
      >
        <Input
          type="date"
          value={details.arrivalDate}
          onChange={(event) => onChange({ arrivalDate: event.target.value })}
        />
      </FormField>
    </>
  );
}

/** Internet and TV: offer only the provinces where this plan is sold. */
export function InternetFields({
  details,
  errors,
  onChange,
  provinces,
}: FieldsProps<InternetDetails> & { provinces: readonly ProvinceCode[] }) {
  return (
    <>
      <FormField id={FIELD_IDS.province} label={f.province.label} required error={errors.province}>
        <NativeSelect
          value={details.province}
          onChange={(event) => {
            const parsed = provinceCodeSchema.safeParse(event.target.value);
            onChange({ province: parsed.success ? parsed.data : '' });
          }}
        >
          <option value="">{f.province.placeholder}</option>
          {provinces.map((province) => (
            <option key={province} value={province}>
              {provinceNames[province]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <ContactFields
        details={details}
        errors={errors}
        onChange={onChange}
        phoneAutoComplete="tel-national"
      />
      <FormField
        id={FIELD_IDS.dateOfBirth}
        label={f.dateOfBirth.label}
        required
        hint={f.dateOfBirth.hint}
        error={errors.dateOfBirth}
      >
        <Input
          type="date"
          value={details.dateOfBirth}
          onChange={(event) => onChange({ dateOfBirth: event.target.value })}
          autoComplete="bday"
        />
      </FormField>
      <AddressFields details={details} errors={errors} onChange={onChange} />
      <FormField
        id={FIELD_IDS.currentProvider}
        label={f.currentProviderOptional.label}
        error={errors.currentProvider}
      >
        <Input
          value={details.currentProvider}
          onChange={(event) => onChange({ currentProvider: event.target.value })}
        />
      </FormField>
      <FormField
        id={FIELD_IDS.preferredInstallationTime}
        label={f.preferredInstallationTime.label}
        hint={f.preferredInstallationTime.hint}
        error={errors.preferredInstallationTime}
      >
        <Input
          value={details.preferredInstallationTime}
          onChange={(event) => onChange({ preferredInstallationTime: event.target.value })}
        />
      </FormField>
    </>
  );
}

interface RadioGroupProps<V extends string> {
  id: string;
  legend: string;
  value: V | '';
  options: readonly { value: V; label: string }[];
  error: string | undefined;
  name: string;
  onSelect: (value: V) => void;
}

/** A required choice with no default, so the customer must answer it. */
function RadioGroup<V extends string>({
  id,
  legend,
  value,
  options,
  error,
  name,
  onSelect,
}: RadioGroupProps<V>) {
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={error ? true : undefined}
      className="space-y-2"
    >
      <legend className="text-sm font-medium">
        {legend}
        <span className="sr-only"> (required)</span>
      </legend>
      {options.map((option) => (
        <div key={option.value} className="flex items-start gap-3">
          <input
            id={`${id}-${option.value}`}
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onSelect(option.value)}
            className="mt-1"
          />
          <label htmlFor={`${id}-${option.value}`}>{option.label}</label>
        </div>
      ))}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Mobile, bring your own device. */
export function MobileFields({ details, errors, onChange }: FieldsProps<MobileDetails>) {
  return (
    <>
      <FormField
        id={FIELD_IDS.lines}
        label={f.lines.label}
        required
        hint={f.lines.hint}
        error={errors.lines}
      >
        <Input
          type="number"
          inputMode="numeric"
          min={MIN_LINES}
          max={MAX_LINES}
          value={details.lines}
          onChange={(event) => onChange({ lines: event.target.value })}
        />
      </FormField>
      <ContactFields
        details={details}
        errors={errors}
        onChange={onChange}
        phoneAutoComplete="tel-national"
      />
      <FormField
        id={FIELD_IDS.currentProvider}
        label={f.currentProvider.label}
        required
        error={errors.currentProvider}
      >
        <NativeSelect
          value={details.currentProvider}
          onChange={(event) => {
            const chosen = MOBILE_PROVIDERS.find((provider) => provider === event.target.value);
            onChange({ currentProvider: chosen ?? '' });
          }}
        >
          <option value="">Choose your provider</option>
          {MOBILE_PROVIDERS.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <RadioGroup
        id={FIELD_IDS.keepNumber}
        name="keepNumber"
        legend={f.keepNumber.label}
        value={details.keepNumber}
        options={KEEP_NUMBER_OPTIONS}
        error={errors.keepNumber}
        onSelect={(value) => onChange({ keepNumber: value })}
      />
      <RadioGroup
        id={FIELD_IDS.simType}
        name="simType"
        legend={f.simType.label}
        value={details.simType}
        options={SIM_TYPE_OPTIONS}
        error={errors.simType}
        onSelect={(value) => onChange({ simType: value })}
      />
      <AddressFields details={details} errors={errors} onChange={onChange} />
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input
            id={FIELD_IDS.creditCheckConsent}
            type="checkbox"
            checked={details.creditCheckConsent}
            onChange={(event) => onChange({ creditCheckConsent: event.target.checked })}
            aria-invalid={errors.creditCheckConsent ? true : undefined}
            aria-describedby={
              errors.creditCheckConsent ? `${FIELD_IDS.creditCheckConsent}-error` : undefined
            }
            className="mt-1"
          />
          <label htmlFor={FIELD_IDS.creditCheckConsent}>{f.creditCheckConsent.label}</label>
        </div>
        {errors.creditCheckConsent ? (
          <p
            id={`${FIELD_IDS.creditCheckConsent}-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.creditCheckConsent}
          </p>
        ) : null}
      </div>
    </>
  );
}
