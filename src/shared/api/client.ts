const TOKEN_KEY = "triolingo.jwt";
const USER_KEY = "triolingo.user";

export const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const sessionStorageApi = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
  setUser(user: unknown): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  clearUser(): void {
    localStorage.removeItem(USER_KEY);
  },
  clearSession(): void {
    this.clearToken();
    this.clearUser();
  },
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true,
): Promise<T> => {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (requireAuth) {
    const token = sessionStorageApi.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: string }).error ?? "Request failed")
        : "Request failed";
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
};
