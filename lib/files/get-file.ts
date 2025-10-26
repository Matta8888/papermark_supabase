import { DocumentStorageType } from "@prisma/client";
import { getDownloadUrl } from "@vercel/blob";
import { match } from "ts-pattern";

export type GetFileOptions = {
  type: DocumentStorageType;
  data: string;
  isDownload?: boolean;
};

export const getFile = async ({
  type,
  data,
  isDownload = false,
}: GetFileOptions): Promise<string> => {
  // Check if we're using Supabase transport but S3_PATH storage type
  const UPLOAD_TRANSPORT = process.env.NEXT_PUBLIC_UPLOAD_TRANSPORT;
  if (UPLOAD_TRANSPORT === "supabase" && type === DocumentStorageType.S3_PATH) {
    return getFileFromSupabase(data);
  }
  
  const url = await match(type)
    .with(DocumentStorageType.VERCEL_BLOB, () => {
      if (isDownload) {
        return getDownloadUrl(data);
      } else {
        return data;
      }
    })
    .with(DocumentStorageType.S3_PATH, async () => getFileFromS3(data))
    .exhaustive();

  return url;
};

const fetchPresignedUrl = async (
  endpoint: string,
  headers: Record<string, string>,
  key: string,
): Promise<string> => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ key }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    let errorMessage: string;

    if (contentType && contentType.includes("application/json")) {
      try {
        const error = await response.json();
        errorMessage =
          error.message || `Request failed with status ${response.status}`;
      } catch (parseError) {
        const textError = await response.text();
        errorMessage =
          textError || `Request failed with status ${response.status}`;
      }
    } else {
      const textError = await response.text();
      errorMessage =
        textError || `Request failed with status ${response.status}`;
    }

    throw new Error(errorMessage);
  }

  const { url } = (await response.json()) as { url: string };
  return url;
};

const getFileFromS3 = async (key: string) => {
  const isServer =
    typeof window === "undefined" && !!process.env.INTERNAL_API_KEY;

  if (isServer) {
    return fetchPresignedUrl(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/file/s3/get-presigned-get-url`,
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
      },
      key,
    );
  } else {
    return fetchPresignedUrl(
      `/api/file/s3/get-presigned-get-url-proxy`,
      {
        "Content-Type": "application/json",
      },
      key,
    );
  }
};

const getFileFromSupabase = async (path: string): Promise<string> => {
  const { createClient } = await import("@supabase/supabase-js");
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(path);
  
  return data.publicUrl;
};
