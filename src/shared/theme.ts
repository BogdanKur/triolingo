const NIGHT_MODE_KEY = "triolingo.nightMode";

const toBool = (value: string | null): boolean => value === "true";

export const readNightMode = (): boolean => toBool(localStorage.getItem(NIGHT_MODE_KEY));

export const persistNightMode = (enabled: boolean): void => {
  localStorage.setItem(NIGHT_MODE_KEY, enabled ? "true" : "false");
};

export const applyNightMode = (enabled: boolean): void => {
  document.documentElement.classList.toggle("theme-dark", enabled);
  document.body.classList.toggle("theme-dark", enabled);
};

export const hydrateNightModeFromStorage = (): void => {
  applyNightMode(readNightMode());
};
