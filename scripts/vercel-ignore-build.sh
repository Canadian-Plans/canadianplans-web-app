#!/usr/bin/env bash
# Vercel `ignoreCommand` for affected-only builds. Exit 0 skips the build,
# any other exit code proceeds — see
# https://vercel.com/docs/projects/project-configuration#ignorecommand
#
# Usage (from an app's vercel.json): `bash ../../scripts/vercel-ignore-build.sh <app>`
set -euo pipefail

app="${1:?usage: vercel-ignore-build.sh <app-dir-name-under-apps/>}"
base="${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}"

# Shared code (packages/, jobs/, root tooling) affects every app; an app's
# own directory affects only itself.
if git diff --quiet "$base" HEAD -- "apps/$app" packages jobs pnpm-workspace.yaml pnpm-lock.yaml; then
  echo "No changes affecting '$app' since $base — skipping build."
  exit 0
fi

echo "Changes affecting '$app' since $base — proceeding with build."
exit 1
