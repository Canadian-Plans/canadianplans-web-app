/**
 * @canadian-plans/contracts — Zod request/response schemas, the canonical error
 * envelope, the OpenAPI generator, and the one typed API client consumed by
 * both admin and the storefronts. No provider secrets or SDK clients. Browser-
 * safe CMS schema definitions land under an explicit `cms` export in a later
 * task.
 */

// Shared scalars, error-envelope pieces, versioned form helper
export {
  countryCodeSchema,
  currencyCodeSchema,
  domainErrorCodeSchema,
  emailSchema,
  errorDetailsSchema,
  isoDateTimeSchema,
  moneySchema,
  pageInfoSchema,
  requestIdSchema,
  schemaVersionSchema,
  versionedFormSchema,
  type CountryCode,
  type CurrencyCode,
  type DomainErrorCode,
  type Email,
  type ErrorDetails,
  type IsoDateTime,
  type Money,
  type PageInfo,
  type RequestId,
  type SchemaVersion,
  type VersionedForm,
} from './common';

// API-surface vocabularies
export {
  MAX_DOCUMENT_BYTES,
  archiveStateSchema,
  commissionStateSchema,
  deliveryStateSchema,
  documentChecklistKeySchema,
  documentMediaTypeSchema,
  documentParentTypeSchema,
  invoiceStatusSchema,
  orderFulfilmentStatusSchema,
  paymentStateSchema,
  type ArchiveState,
  type CommissionState,
  type DeliveryState,
  type DocumentChecklistKey,
  type DocumentMediaType,
  type DocumentParentType,
  type InvoiceStatus,
  type OrderFulfilmentStatus,
  type PaymentState,
} from './domain';

export { healthResponseSchema, type HealthResponse } from './health';

export {
  apiErrorCodeSchema,
  apiErrorResponseSchema,
  apiErrorSchema,
  authErrorCodeSchema,
  inviteStaffRequestSchema,
  inviteStaffResponseSchema,
  membershipStatusSchema,
  revokeStaffResponseSchema,
  staffAuthErrorCodeSchema,
  staffPermissionNameSchema,
  staffRoleNameSchema,
  staffWorkspaceAccessResponseSchema,
  staffWorkspaceSchema,
  staffWorkspacesResponseSchema,
  type ApiError,
  type ApiErrorCode,
  type ApiErrorResponse,
  type AuthErrorCode,
  type InviteStaffRequest,
  type InviteStaffResponse,
  type RevokeStaffResponse,
  type StaffAuthErrorCode,
  type StaffWorkspace,
  type StaffWorkspaceAccessResponse,
  type StaffWorkspacesResponse,
} from './staff-auth';

export {
  createServiceCredentialRequestSchema,
  createServiceCredentialResponseSchema,
  listServiceCredentialsResponseSchema,
  revokeServiceCredentialResponseSchema,
  serviceCredentialSummarySchema,
  websiteAuthErrorCodeSchema,
  websiteScopeSchema,
  type CreateServiceCredentialRequest,
  type CreateServiceCredentialResponse,
  type ListServiceCredentialsResponse,
  type RevokeServiceCredentialResponse,
  type ServiceCredentialSummary,
  type WebsiteAuthErrorCode,
} from './website-auth';

// Request families
export {
  attributionSchema,
  createLeadRequestSchema,
  createLeadResponseSchema,
  draftGrantSchema,
  leadContactSchema,
  leadFormSchema,
  leadStatusSchema,
  leadSummarySchema,
  updateLeadRequestSchema,
  updateLeadResponseSchema,
  type Attribution,
  type CreateLeadRequest,
  type CreateLeadResponse,
  type DraftGrant,
  type LeadContact,
  type LeadForm,
  type LeadStatus,
  type LeadSummary,
  type UpdateLeadRequest,
  type UpdateLeadResponse,
} from './leads';

export {
  chargeComponentSchema,
  createQuoteRequestSchema,
  createQuoteResponseSchema,
  quoteSchema,
  type ChargeComponent,
  type CreateQuoteRequest,
  type CreateQuoteResponse,
  type Quote,
} from './quotes';

export {
  orderConsentSchema,
  orderSummarySchema,
  submitOrderRequestSchema,
  submitOrderResponseSchema,
  type OrderConsent,
  type OrderSummary,
  type SubmitOrderRequest,
  type SubmitOrderResponse,
} from './orders';

export {
  getWorkspaceOrderResponseSchema,
  listWorkspaceOrdersQuerySchema,
  listWorkspaceOrdersResponseSchema,
  orderDetailSchema,
  orderHistoryEntrySchema,
  orderSnapshotSchema,
  patchWorkspaceOrderRequestSchema,
  patchWorkspaceOrderResponseSchema,
  type GetWorkspaceOrderResponse,
  type ListWorkspaceOrdersQuery,
  type ListWorkspaceOrdersResponse,
  type OrderDetail,
  type OrderHistoryEntry,
  type OrderSnapshot,
  type PatchWorkspaceOrderRequest,
  type PatchWorkspaceOrderResponse,
} from './workspace-orders';

export {
  createUploadIntentRequestSchema,
  createUploadIntentResponseSchema,
  finalizeUploadRequestSchema,
  finalizeUploadResponseSchema,
  type CreateUploadIntentRequest,
  type CreateUploadIntentResponse,
  type FinalizeUploadRequest,
  type FinalizeUploadResponse,
} from './uploads';

export {
  createDownloadLinkResponseSchema,
  fileStatusSchema,
  fileSummarySchema,
  type CreateDownloadLinkResponse,
  type FileStatus,
  type FileSummary,
} from './files';

export {
  changeCommissionStateRequestSchema,
  changeCommissionStateResponseSchema,
  commissionLineSchema,
  invoiceLineSchema,
  invoiceSchema,
  partnerInvoiceRequestSchema,
  partnerInvoiceResponseSchema,
  type ChangeCommissionStateRequest,
  type ChangeCommissionStateResponse,
  type CommissionLine,
  type Invoice,
  type InvoiceLine,
  type PartnerInvoiceRequest,
  type PartnerInvoiceResponse,
} from './partners';

export {
  webhookAckResponseSchema,
  webhookDeliveryRequestSchema,
  webhookProviderSchema,
  type WebhookAckResponse,
  type WebhookDeliveryRequest,
  type WebhookProvider,
} from './webhooks';

export {
  createExportRequestSchema,
  createExportResponseSchema,
  exportJobSchema,
  exportJobStatusSchema,
  exportKindSchema,
  type CreateExportRequest,
  type CreateExportResponse,
  type ExportJob,
  type ExportJobStatus,
  type ExportKind,
} from './exports';

export {
  trackingGrantSchema,
  trackingOtpRequestSchema,
  trackingOtpResponseSchema,
  trackingStatusResponseSchema,
  type TrackingGrant,
  type TrackingOtpRequest,
  type TrackingOtpResponse,
  type TrackingStatusResponse,
} from './tracking';

// Endpoint registry, OpenAPI generation, typed client
export {
  endpoints,
  type EndpointAuth,
  type EndpointDef,
  type EndpointHeader,
  type HttpMethod,
} from './endpoints';

export { buildOpenApiDocument, type BuildOpenApiOptions } from './openapi';

export {
  BackendError,
  createBackendClient,
  type BackendClient,
  type BackendClientOptions,
} from './client';
