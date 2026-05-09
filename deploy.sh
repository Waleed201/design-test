#!/usr/bin/env bash
# deploy.sh — manual one-shot deploy to Google Cloud Run
# Usage: ./deploy.sh [PROJECT_ID] [REGION]
# Example: ./deploy.sh my-gcp-project us-central1
#
# Prerequisites:
#   gcloud auth login && gcloud auth configure-docker <REGION>-docker.pkg.dev
#   Artifact Registry repo must exist (created by setup.sh)

set -euo pipefail

PROJECT_ID="${1:-${GOOGLE_CLOUD_PROJECT:-}}"
REGION="${2:-us-central1}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: PROJECT_ID is required."
  echo "Usage: $0 <PROJECT_ID> [REGION]"
  exit 1
fi

REPO="cert-engine"
BACKEND_SVC="cert-engine-backend"
FRONTEND_SVC="cert-engine-frontend"
TAG="$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

echo "==> Project : $PROJECT_ID"
echo "==> Region  : $REGION"
echo "==> Tag     : $TAG"
echo ""

# ── Build & push backend ──────────────────────────────────────────────────────
echo "==> [1/5] Building backend image..."
docker build -t "${REGISTRY}/backend:${TAG}" -t "${REGISTRY}/backend:latest" ./backend

echo "==> [2/5] Pushing backend image..."
docker push "${REGISTRY}/backend:${TAG}"
docker push "${REGISTRY}/backend:latest"

# ── Deploy backend ────────────────────────────────────────────────────────────
echo "==> [3/5] Deploying backend Cloud Run service..."
gcloud run deploy "${BACKEND_SVC}" \
  --image="${REGISTRY}/backend:${TAG}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=120s \
  --concurrency=10 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars=ASPNETCORE_ENVIRONMENT=Production

BACKEND_URL=$(gcloud run services describe "${BACKEND_SVC}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')
echo "    Backend URL: $BACKEND_URL"

# ── Build & push frontend ─────────────────────────────────────────────────────
echo "==> [4/5] Building frontend image..."
docker build -t "${REGISTRY}/frontend:${TAG}" -t "${REGISTRY}/frontend:latest" ./frontend

echo "    Pushing frontend image..."
docker push "${REGISTRY}/frontend:${TAG}"
docker push "${REGISTRY}/frontend:latest"

# ── Deploy frontend ───────────────────────────────────────────────────────────
echo "==> [5/5] Deploying frontend Cloud Run service..."
gcloud run deploy "${FRONTEND_SVC}" \
  --image="${REGISTRY}/frontend:${TAG}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --timeout=30s \
  --concurrency=80 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="BACKEND_URL=${BACKEND_URL}"

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SVC}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format='value(status.url)')

echo ""
echo "==================================="
echo "  Certificate Engine deployed!"
echo "  Frontend : ${FRONTEND_URL}"
echo "  Backend  : ${BACKEND_URL}"
echo "==================================="
