const SUPPORT_CACHE_KEY = "healthplus_support_settings";

export const DEFAULT_SUPPORT_SETTINGS = {
  supportEmail: "support@healthplus.com",
  supportPhone: "",
  supportTiming: "Monday to Friday, 9:00 AM - 6:00 PM"
};

export function getCachedSupportSettings() {
  try {
    return {
      ...DEFAULT_SUPPORT_SETTINGS,
      ...JSON.parse(localStorage.getItem(SUPPORT_CACHE_KEY))
    };
  } catch {
    return { ...DEFAULT_SUPPORT_SETTINGS };
  }
}

export function cacheSupportSettings(settings) {
  const nextSettings = { ...DEFAULT_SUPPORT_SETTINGS, ...(settings || {}) };
  localStorage.setItem(SUPPORT_CACHE_KEY, JSON.stringify(nextSettings));
  return nextSettings;
}

export async function refreshSupportSettings() {
  const response = await fetch(`${getApiBaseUrl()}/api/support`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    return getCachedSupportSettings();
  }

  const payload = await response.json();
  return cacheSupportSettings(payload.supportSettings);
}

function getApiBaseUrl() {
  return (
    window.HEALTH_PLUS_API_URL ||
    (["localhost", "127.0.0.1"].includes(window.location.hostname)
      ? window.location.origin
      : "https://health-plus-backend-1n66.onrender.com")
  );
}
