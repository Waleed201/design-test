#!/usr/bin/env bash
# setup-gcp.sh — one-time GCP project setup for Certificate Engine
# Run this ONCE before the first deploy.
#
# Usage: ./setup-gcp.sh <PROJECT_ID> [REGION]

set -euo pipefail

PROJECT_ID="${1:-}"
REGION="${2:-us-central1}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Usage: $0 <PROJECT_ID> [REGION]"
  exit 1
fi

REPO="cert-engine"

echo "==> Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project="${PROJECT_ID}"

echo "==> Creating Artifact Registry repository: ${REPO}..."
gcloud artifacts repositories create "${REPO}" \
  --repository-format=docker \
  --location="${REGION}" \
  --project="${PROJECT_ID}" \
  --description="Certificate Engine Docker images" \
  2>/dev/null || echo "    (repository already exists, skipping)"

echo "==> Configuring Docker credential helper..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "==> Granting Cloud Build SA permissions to deploy Cloud Run..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin" --quiet

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser" --quiet

echo ""
echo "==> GCP setup complete for project: ${PROJECT_ID}"
echo "    Next steps:"
echo "      1. ./deploy.sh ${PROJECT_ID} ${REGION}          # manual deploy"
echo "      2. Or connect the repo in Cloud Build console   # automated CI/CD"
