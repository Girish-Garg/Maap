/**
 * Typed, validated access to the environment.
 *
 * Reads are lazy (via getters) so a missing var fails at the call site with a
 * clear message, rather than crashing the whole module graph at import time.
 *
 * Everything here is server-side. Nothing in this file is NEXT_PUBLIC_*, so no
 * secret can be inlined into the client bundle: sign-in happens through Auth.js
 * endpoints and logo uploads through a Server Action, neither of which needs a
 * key in the browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        `Local dev: copy .env.example to .env and fill it in. ` +
        `Production: set it in the VPS .env next to docker-compose.prod.yml, ` +
        `then redeploy.`,
    );
  }
  return value;
}

export const env = {
  /** Signing key for session cookies. Generate with `npx auth secret`. */
  get authSecret(): string {
    return required("AUTH_SECRET", process.env.AUTH_SECRET);
  },

  /**
   * Google sign-in is optional. When these aren't set the provider is left out
   * and the login screen hides the button, so email + password still works.
   */
  get googleConfigured(): boolean {
    return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  },
  get googleClientId(): string {
    return required("AUTH_GOOGLE_ID", process.env.AUTH_GOOGLE_ID);
  },
  get googleClientSecret(): string {
    return required("AUTH_GOOGLE_SECRET", process.env.AUTH_GOOGLE_SECRET);
  },

  /**
   * OCI Object Storage, holding business logos, reached over its S3-compatible
   * endpoint. Optional: without it everything works except uploading a logo.
   *
   * The bucket is shared with other projects, so `storagePrefix` is the folder
   * this project is confined to. Credentials are read only on the server.
   */
  get storageConfigured(): boolean {
    return Boolean(
      process.env.OCI_BUCKET &&
        process.env.OCI_ACCESS_KEY_ID &&
        process.env.OCI_SECRET_ACCESS_KEY &&
        (process.env.OCI_S3_ENDPOINT ||
          (process.env.OCI_NAMESPACE && process.env.OCI_REGION)),
    );
  },

  /**
   * The S3 endpoint. Normally derived from the namespace and region, which is
   * the form OCI documents; set OCI_S3_ENDPOINT directly to point at something
   * else (another S3 provider, or a local one for testing).
   */
  get storageEndpoint(): string {
    const explicit = process.env.OCI_S3_ENDPOINT;
    if (explicit) return explicit;
    const namespace = required("OCI_NAMESPACE", process.env.OCI_NAMESPACE);
    const region = required("OCI_REGION", process.env.OCI_REGION);
    return `https://${namespace}.compat.objectstorage.${region}.oraclecloud.com`;
  },
  get storageRegion(): string {
    // Only used to sign requests; any value works when an endpoint is explicit.
    return process.env.OCI_REGION ?? "us-east-1";
  },
  get storageBucket(): string {
    return required("OCI_BUCKET", process.env.OCI_BUCKET);
  },
  get storageAccessKeyId(): string {
    return required("OCI_ACCESS_KEY_ID", process.env.OCI_ACCESS_KEY_ID);
  },
  get storageSecretAccessKey(): string {
    return required("OCI_SECRET_ACCESS_KEY", process.env.OCI_SECRET_ACCESS_KEY);
  },
  /** This project's folder in the shared bucket. */
  get storagePrefix(): string {
    return (process.env.OCI_PREFIX ?? "maap").replace(/^\/+|\/+$/g, "");
  },
};
