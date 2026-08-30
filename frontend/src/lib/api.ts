const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("nexora_token")
      : null;

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...options.headers,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ??
        "Une erreur est survenue",
    );
  }

  return data;
}

/**
 * Comme apiFetch, mais pour les endpoints qui renvoient un
 * fichier binaire (ex: PDF) plutôt que du JSON.
 */
export async function apiFetchBlob(
  endpoint: string,
  options: RequestInit = {},
): Promise<Blob> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("nexora_token")
      : null;

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),

        ...options.headers,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      "Une erreur est survenue",
    );
  }

  return response.blob();
}