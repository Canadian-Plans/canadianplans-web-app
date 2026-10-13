import 'server-only';
import { internetCopy, internetPlans, internetLookupFixtures } from '@content/home-internet';
import { isValidPostalCode } from './postal-preview';
import {
  normalizeInternetPostalCode,
  isValidMoveInDate,
  type InternetLookupInput,
  type InternetLookupResult,
} from './internet-check';

/** The only lookup seam. Replace this deterministic fixture implementation with a backend API. */
export async function lookupInternetAvailability(
  input: InternetLookupInput,
): Promise<InternetLookupResult> {
  if (!isValidPostalCode(input.postalCode))
    return { status: 'invalid', field: 'postalCode', previewOnly: true };
  if (!isValidMoveInDate(input.moveInDate))
    return { status: 'invalid', field: 'moveInDate', previewOnly: true };
  const postalCode = normalizeInternetPostalCode(input.postalCode);
  if (postalCode === internetLookupFixtures.availablePostalCode)
    return {
      status: 'available',
      postalCode,
      address: internetCopy.result.address,
      plans: [...internetPlans].reverse(),
      earliestInstall: internetCopy.result.earliestInstall,
      previewOnly: true,
    };
  if (postalCode === internetLookupFixtures.unavailablePostalCode)
    return { status: 'unavailable', postalCode, previewOnly: true };
  // An unconfigured fixture is not a real "unavailable" verdict.
  return { status: 'error', reason: 'unconfigured', previewOnly: true };
}
