import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/**
 * Object storage, spoken to over the S3 API.
 *
 * OCI Object Storage exposes an S3-compatible endpoint, so this uses the S3
 * client rather than the OCI SDK: it authenticates with a Customer Secret Key
 * (an access key pair) instead of a PEM file that would have to be mounted into
 * the container, and the same code works against any S3 provider.
 *
 * The bucket is shared with other projects, so every key this module touches is
 * confined to `<prefix>/<user_id>/`. Nothing here ever reads or writes outside
 * that, and the bucket stays private - objects are served by the app, not
 * linked to directly, so making a shared bucket public is never required.
 */

let cached: S3Client | undefined;

function client(): S3Client {
  if (!cached) {
    cached = new S3Client({
      endpoint: env.storageEndpoint,
      region: env.storageRegion,
      credentials: {
        accessKeyId: env.storageAccessKeyId,
        secretAccessKey: env.storageSecretAccessKey,
      },
      // OCI's S3 compatibility layer addresses buckets by path, not by a
      // bucket-name subdomain.
      forcePathStyle: true,
    });
  }
  return cached;
}

/**
 * This project's slice of the shared bucket. Keys are namespaced by project
 * first and user second, so another project's objects can never collide with
 * these and a user's files stay together under one prefix.
 */
export function userPrefix(userId: string): string {
  return `${env.storagePrefix}/${userId}/`;
}

export function objectKey(userId: string, filename: string): string {
  return `${userPrefix(userId)}${filename}`;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: env.storageBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

/** The object's bytes and type, or null when it isn't there. */
export async function getObject(
  key: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const result = await client().send(
      new GetObjectCommand({ Bucket: env.storageBucket, Key: key }),
    );
    if (!result.Body) return null;
    return {
      body: await result.Body.transformToByteArray(),
      contentType: result.ContentType ?? "application/octet-stream",
    };
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Deletes everything under a prefix. Used when a logo is replaced or removed:
 * without it the bucket would keep every image a user ever uploaded, and a
 * changed file extension would leave the previous one stranded for good.
 *
 * Objects go one at a time rather than through S3's batch delete. Batch delete
 * requires a checksum header, and the AWS SDK sends CRC32 by default (since
 * v3.729); OCI accepts Content-MD5, SHA256 or CRC32C but not plain CRC32, and
 * answers 400 InvalidRequest. Single deletes require no checksum, so they work
 * everywhere - and a user's folder holds one file, so there is nothing to gain
 * from batching.
 */
export async function deletePrefix(prefix: string): Promise<number> {
  const s3 = client();
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.storageBucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys = (listed.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => Boolean(k));

    for (const Key of keys) {
      await s3.send(
        new DeleteObjectCommand({ Bucket: env.storageBucket, Key }),
      );
      deleted += 1;
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return deleted;
}

/** A missing object is an expected outcome, not a failure worth throwing on. */
function isNotFound(error: unknown): boolean {
  const name = (error as { name?: string })?.name;
  const status = (error as { $metadata?: { httpStatusCode?: number } })
    ?.$metadata?.httpStatusCode;
  return name === "NoSuchKey" || name === "NotFound" || status === 404;
}
