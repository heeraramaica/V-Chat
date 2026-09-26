/**
 * Safe API Fetch Utilities
 * Prevents "Unexpected end of JSON input" errors by safely inspecting response.ok
 * and reading response text before attempting to parse JSON.
 */

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Safely fetches an API endpoint, reads text first, inspects status & ok,
 * and parses JSON safely without throwing on empty or invalid text.
 */
export async function safeFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        'Accept': 'application/json',
        ...(init?.headers || {})
      }
    });

    // Safely read response as text first
    const rawText = await res.text();
    let parsedData: any = null;

    if (rawText && rawText.trim().length > 0) {
      try {
        parsedData = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn(`[safeFetch] Response from ${String(input)} was not valid JSON:`, rawText);
        parsedData = { raw: rawText };
      }
    }

    if (!res.ok) {
      const errorMsg =
        parsedData?.error ||
        parsedData?.message ||
        (parsedData?.raw && typeof parsedData.raw === 'string' && parsedData.raw.length < 200
          ? parsedData.raw
          : `Request failed with HTTP status ${res.status}`);

      return {
        ok: false,
        status: res.status,
        data: parsedData,
        error: errorMsg
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsedData as T
    };
  } catch (err: any) {
    console.error(`[safeFetch] Network/fetch error for ${String(input)}:`, err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Network error: could not connect to server'
    };
  }
}

/**
 * Safely inspects and reads a Response object, returning parsed JSON data or throws a descriptive Error.
 */
export async function safeReadJson<T = any>(res: Response): Promise<T> {
  const rawText = await res.text();
  let parsed: any = null;

  if (rawText && rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { raw: rawText };
    }
  }

  if (!res.ok) {
    const message =
      parsed?.error ||
      parsed?.message ||
      (parsed?.raw && typeof parsed.raw === 'string' && parsed.raw.length < 200
        ? parsed.raw
        : `Request failed with HTTP status ${res.status}`);
    throw new Error(message);
  }

  return (parsed || {}) as T;
}
