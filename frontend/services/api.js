import { getAccessToken, logout } from "/auth/auth.js";

const API_BASE_URL =
  window.HEALTH_PLUS_API_URL ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "https://health-plus-backend-1n66.onrender.com");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch(path, options = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    if (response.status === 401) {
      logout();
    }
    throw new ApiError(payload.message || "Request failed.", response.status);
  }

  return payload;
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
