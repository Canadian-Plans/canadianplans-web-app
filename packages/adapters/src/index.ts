/**
 * @canadian-plans/adapters — server-only Sanity/R2/email/delivery/payment/
 * analytics provider adapters and their in-memory fakes for tests.
 *
 * No provider is wired yet. Each future adapter gets its own explicit export
 * (e.g. `@canadian-plans/adapters/email`) so provider SDKs never enter a
 * browser bundle by accident.
 */
export const ADAPTERS_PACKAGE_PLACEHOLDER = true as const;

export {
  analyticsEventNames,
  FakeAnalyticsSink,
  FakeEmailAdapter,
  type AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsSink,
  type EmailAdapter,
  type EmailMessage,
  type ProviderDeliveryResult,
} from './messaging.js';

export {
  LogAnalyticsSink,
  UmamiAnalyticsSink,
  type AnalyticsLogLine,
  type AnalyticsLogger,
  type UmamiAnalyticsOptions,
} from './analytics.js';

export {
  createDeletionLedgerFromEnv,
  deletionActions,
  HttpDeletionLedger,
  InMemoryDeletionLedger,
  type DeletionAction,
  type DeletionLedger,
  type DeletionLedgerAcknowledgement,
  type DeletionLedgerEvent,
  type HttpDeletionLedgerOptions,
} from './deletion-ledger.js';

export {
  HttpSiteRevalidator,
  SanityCatalogueAdapter,
  SanityProviderError,
  type SanityCatalogue,
  type SanityCatalogueConfig,
  type SiteRevalidator,
} from './sanity.js';

export {
  InMemoryR2DocumentStore,
  detectDocumentType,
  sha256Hex,
  type CopyForExportInput,
  type CreateUploadInput,
  type DocumentMediaType,
  type IssueDownloadInput,
  type PresignedDownload,
  type PresignedUpload,
  type R2DocumentStore,
  type VerifyUploadInput,
  type VerifyUploadRejection,
  type VerifyUploadResult,
} from './r2.js';

export {
  S3R2DocumentStore,
  configFromEnv,
  createR2DocumentStoreFromEnv,
  presignUrl,
  type R2Config,
} from './r2-s3.js';
