import { useEffect, useState } from "react";

import {
  fetchProtectedFileBlobUrl,
  isProtectedDocumentFilePath,
} from "./api/filesApi";

export function useResolvedProtectedFileUrl(fileUrl) {
  const [resolvedUrl, setResolvedUrl] = useState(fileUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrlToRevoke = null;

    async function resolve() {
      if (!fileUrl) {
        setResolvedUrl("");
        setLoading(false);
        setError(null);
        return;
      }

      if (!isProtectedDocumentFilePath(fileUrl)) {
        setResolvedUrl(fileUrl);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const blobUrl = await fetchProtectedFileBlobUrl(fileUrl);

        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        blobUrlToRevoke = blobUrl;
        setResolvedUrl(blobUrl);
      } catch (resolveError) {
        if (!cancelled) {
          setError(resolveError);
          setResolvedUrl("");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    resolve();

    return () => {
      cancelled = true;
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
      }
    };
  }, [fileUrl]);

  return { resolvedUrl, loading, error };
}
