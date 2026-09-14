/**
 * Browser-safe CMS schema export (PLATFORM_CONTEXT.md §4a). Import via
 * `@canadian-plans/contracts/cms`, never from the package root, so apps that
 * only need Zod contracts are not forced to bundle the Sanity Studio schema
 * builder.
 */
export {
  DOCUMENT_CHECKLIST_VALUES,
  PRODUCT_TYPE_VALUES,
  SINGLETON_DOCUMENT_TYPES,
  documentTypes,
  pageSectionTypes,
  schemaTypes,
  type DocumentChecklistValue,
  type ProductType,
} from './schema-types';
