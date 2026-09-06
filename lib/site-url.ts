export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (explicit) {
    return normalizeUrl(explicit);
  }

  // Public deployment URL exposed by Vercel.
  const publicVercelUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim();

  if (publicVercelUrl) {
    return normalizeUrl(publicVercelUrl);
  }

  // Stable production-domain system variable when available.
  const productionHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (productionHost) {
    return normalizeUrl(productionHost);
  }

  // Current deployment URL on the server.
  const deploymentHost = process.env.VERCEL_URL?.trim();

  if (deploymentHost) {
    return normalizeUrl(deploymentHost);
  }

  return "http://localhost:3000";
}

export function getSiteUrlObject() {
  return new URL(getSiteUrl());
}

function normalizeUrl(value: string) {
  const trimmed = value.replace(/\/+$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
