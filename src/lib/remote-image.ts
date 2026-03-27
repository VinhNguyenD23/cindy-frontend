const REMOTE_IMAGE_ACCEPT_HEADER =
  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
const REMOTE_IMAGE_RETRY_DELAYS_MS = [0, 750, 1000, 1500, 2000, 3000, 4000];
const RETRYABLE_REMOTE_IMAGE_STATUSES = new Set([
  403, 404, 408, 425, 429, 500, 502, 503, 504,
]);

export async function fetchRemoteImageWithRetry(
  targetUrl: string,
  init: RequestInit = {},
) {
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let index = 0; index < REMOTE_IMAGE_RETRY_DELAYS_MS.length; index += 1) {
    const delayMs = REMOTE_IMAGE_RETRY_DELAYS_MS[index];

    if (delayMs > 0) {
      await wait(delayMs);
    }

    try {
      const response = await fetch(targetUrl, {
        ...init,
        cache: "no-store",
        headers: buildHeaders(init.headers),
      });

      if (response.ok && response.body) {
        return response;
      }

      lastResponse = response;

      if (
        index === REMOTE_IMAGE_RETRY_DELAYS_MS.length - 1 ||
        !RETRYABLE_REMOTE_IMAGE_STATUSES.has(response.status)
      ) {
        return response;
      }

      await disposeResponse(response);
    } catch (error) {
      lastError = error;

      if (index === REMOTE_IMAGE_RETRY_DELAYS_MS.length - 1) {
        throw error;
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Không thể tải video từ dịch vụ nguồn.");
}

export async function waitForRemoteImageAvailability(targetUrl: string) {
  for (let index = 0; index < REMOTE_IMAGE_RETRY_DELAYS_MS.length; index += 1) {
    const delayMs = REMOTE_IMAGE_RETRY_DELAYS_MS[index];

    if (delayMs > 0) {
      await wait(delayMs);
    }

    try {
      const response = await fetch(targetUrl, {
        method: "HEAD",
        cache: "no-store",
        headers: buildHeaders(undefined),
      });

      if (response.ok) {
        await disposeResponse(response);
        return true;
      }

      if (
        index === REMOTE_IMAGE_RETRY_DELAYS_MS.length - 1 ||
        !RETRYABLE_REMOTE_IMAGE_STATUSES.has(response.status)
      ) {
        await disposeResponse(response);
        return false;
      }

      await disposeResponse(response);
    } catch {
      if (index === REMOTE_IMAGE_RETRY_DELAYS_MS.length - 1) {
        return false;
      }
    }
  }

  return false;
}

async function disposeResponse(response: Response) {
  try {
    await response.body?.cancel();
  } catch {}
}

function buildHeaders(inputHeaders: HeadersInit | undefined) {
  const headers = new Headers(inputHeaders);

  if (!headers.has("accept")) {
    headers.set("accept", REMOTE_IMAGE_ACCEPT_HEADER);
  }

  return headers;
}

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}
