import { createClient } from '@sanity/client';
import { defineEnableDraftMode } from 'next-sanity/draft-mode';
import { NextResponse } from 'next/server';

import { getSanityPreviewConfig, isAllowedPreviewPath } from '../../../../lib/preview';

export const dynamic = 'force-dynamic';

const config = getSanityPreviewConfig();
const enableDraftMode = config
  ? defineEnableDraftMode({
      client: createClient({
        projectId: config.projectId,
        dataset: config.dataset,
        token: config.token,
        apiVersion: '2026-01-01',
        useCdn: false,
      }),
    })
  : undefined;

/**
 * Editor-only, allowlisted draft preview entry point. `defineEnableDraftMode`
 * verifies the request against the Studio-issued preview session before
 * enabling Next.js draft mode — an unauthenticated caller is rejected there.
 * This wrapper additionally rejects any target path that isn't allowlisted
 * (REQ 08), so an editor session can never be used to preview drafts on an
 * arbitrary route.
 */
export async function GET(request: Request): Promise<Response> {
  if (!enableDraftMode) {
    return NextResponse.json({ error: 'preview_unconfigured' }, { status: 503 });
  }
  const url = new URL(request.url);
  const redirectTo =
    url.searchParams.get('sanity-preview-pathname') ?? url.searchParams.get('redirectTo') ?? '/';
  if (!isAllowedPreviewPath(redirectTo)) {
    return NextResponse.json({ error: 'preview_path_not_allowed' }, { status: 403 });
  }
  const response = await enableDraftMode.GET(request);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
