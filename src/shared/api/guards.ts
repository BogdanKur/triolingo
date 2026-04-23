import { authApi, profileApi, sessionStorageApi } from "./index";
import { applyNightMode, hydrateNightModeFromStorage, persistNightMode } from "../theme";

export const ensureSession = async (): Promise<void> => {
  hydrateNightModeFromStorage();

  const token = sessionStorageApi.getToken();
  if (!token) {
    window.location.href = "/second.html";
    return;
  }

  try {
    await authApi.me();
    void profileApi
      .getSettings()
      .then((response) => {
        persistNightMode(response.settings.nightMode);
        applyNightMode(response.settings.nightMode);
      })
      .catch(() => {
        // Leave theme from local cache.
      });
  } catch {
    sessionStorageApi.clearSession();
    window.location.href = "/second.html";
  }
};
