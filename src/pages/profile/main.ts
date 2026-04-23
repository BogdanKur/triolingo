import "../../shared/styles/base.css";
import "./profile.css";
import { ApiError, profileApi, progressApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import type { ProfileAchievementItem, ProfileStatItem } from "../../shared/types/profile";
import { profileConfig } from "./config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const root = document.createElement("main");
root.className = "profile-screen";
root.style.setProperty("--bg-image", `url("${profileConfig.assets.bg}")`);

const renderStat = (item: ProfileStatItem): string => `
  <article class="profile-stat-card" data-id="${item.id}">
    <img class="profile-stat-icon" src="${item.icon}" alt="" />
    <p class="profile-stat-text">
      <span class="profile-stat-value">${item.value}</span>
      <span class="profile-stat-suffix">${item.suffix}</span>
    </p>
  </article>
`;

const renderAchievement = (item: ProfileAchievementItem): string => {
  if (item.highlighted) {
    return `
      <article class="profile-achievement profile-achievement--highlighted" data-id="${item.id}">
        <img class="profile-achievement-icon" src="${item.icon}" alt="" />
        <div class="profile-achievement-copy">
          <p class="profile-achievement-title">${item.title}</p>
          <p class="profile-achievement-text">${item.description}</p>
        </div>
      </article>
    `;
  }

  const total = item.total ?? 100;
  const current = item.current ?? 0;
  const progress = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;

  return `
    <article class="profile-achievement profile-achievement--progress" data-id="${item.id}">
      <img class="profile-achievement-icon" src="${item.icon}" alt="" />
      <div class="profile-achievement-copy">
        <p class="profile-achievement-title">${item.title}</p>
        <div class="profile-progress-track">
          <span class="profile-progress-fill" style="--progress:${progress}%;"></span>
        </div>
        <p class="profile-achievement-text">${item.description}</p>
      </div>
    </article>
  `;
};

const statsMarkup = profileConfig.stats.map(renderStat).join("");
const achievementsMarkup = profileConfig.achievements.map(renderAchievement).join("");

const drawerItemsMarkup = profileConfig.drawerItems
  .map(
    (item) => `
      <li class="drawer-row">
        <button
          type="button"
          class="drawer-link"
          data-item-id="${item.id}"
          data-item-href="${item.href ?? ""}"
        >
          ${item.label}
        </button>
        <img class="drawer-line" src="${profileConfig.assets.drawerLine}" alt="" />
      </li>
    `,
  )
  .join("");

root.innerHTML = `
  <header class="profile-header">
    <div class="profile-header-inner">
      <div class="profile-brand">
        <img class="profile-brand-mascot" src="${profileConfig.assets.mascot}" alt="" />
        <p class="profile-brand-text">${profileConfig.texts.brand}</p>
      </div>
      <h1 class="profile-title">${profileConfig.texts.pageTitle}</h1>
      <button class="profile-burger" type="button" aria-label="${profileConfig.texts.burgerAriaLabel}">
        <img src="${profileConfig.assets.burger}" alt="" />
      </button>
    </div>
  </header>

  <section class="profile-main">
    <div class="profile-scroll">
      <article class="profile-hero">
        <img class="profile-hero-bg" src="${profileConfig.assets.heroBg}" alt="" />
        <img class="profile-hero-avatar" src="${profileConfig.assets.heroAvatar}" alt="" />
        <button class="profile-hero-edit" type="button" aria-label="Редактировать профиль">
          <img src="${profileConfig.assets.heroEdit}" alt="" />
        </button>
      </article>

      <p class="profile-name">${profileConfig.texts.profileName}</p>

      <div class="profile-language-row">
        <img class="profile-language-flag" src="${profileConfig.assets.languageFlag}" alt="" />
        <p class="profile-language-text">${profileConfig.texts.languageLabel}</p>
      </div>

      <div class="profile-divider"></div>

      <h2 class="profile-section-title">${profileConfig.texts.statsTitle}</h2>
      <div class="profile-stats-list">
        ${statsMarkup}
      </div>

      <div class="profile-divider"></div>

      <h2 class="profile-section-title">${profileConfig.texts.achievementsTitle}</h2>
      <div class="profile-achievements-list">
        ${achievementsMarkup}
      </div>

      <p class="profile-status" hidden></p>
    </div>
  </section>

  <div class="profile-pet-overlay" hidden></div>
  <aside class="profile-pet-popup" aria-hidden="true">
    <div class="profile-pet-popup-inner">
      <button
        class="profile-pet-popup-icon-close"
        type="button"
        aria-label="Закрыть выбор чудика"
      >
        ×
      </button>
      <h3 class="profile-pet-popup-title">Выбор чудика</h3>
      <p class="profile-pet-popup-subtitle">Открытые чудики</p>
      <div class="profile-pet-grid"></div>
      <button class="profile-pet-popup-close" type="button">Закрыть</button>
    </div>
  </aside>

  <div class="drawer-overlay" hidden></div>
  <aside class="drawer" aria-hidden="true">
    <header class="drawer-head">
      <img class="drawer-head-icon" src="${profileConfig.assets.mascot}" alt="" />
      <p class="drawer-head-title">${profileConfig.texts.brand}</p>
    </header>
    <ul class="drawer-list">${drawerItemsMarkup}</ul>
  </aside>
`;

app.append(root);

const burger = root.querySelector<HTMLButtonElement>(".profile-burger");
const overlay = root.querySelector<HTMLDivElement>(".drawer-overlay");
const drawer = root.querySelector<HTMLElement>(".drawer");
const drawerLinks = root.querySelectorAll<HTMLButtonElement>(".drawer-link");
const petOverlay = root.querySelector<HTMLDivElement>(".profile-pet-overlay");
const petPopup = root.querySelector<HTMLElement>(".profile-pet-popup");
const petGrid = root.querySelector<HTMLDivElement>(".profile-pet-grid");
const petPopupClose = root.querySelector<HTMLButtonElement>(".profile-pet-popup-close");
const petPopupIconClose = root.querySelector<HTMLButtonElement>(".profile-pet-popup-icon-close");
const nameEl = root.querySelector<HTMLParagraphElement>(".profile-name");
const languageEl = root.querySelector<HTMLParagraphElement>(".profile-language-text");
const heroAvatar = root.querySelector<HTMLImageElement>(".profile-hero-avatar");
const editButton = root.querySelector<HTMLButtonElement>(".profile-hero-edit");
const statsList = root.querySelector<HTMLDivElement>(".profile-stats-list");
const achievementsList = root.querySelector<HTMLDivElement>(".profile-achievements-list");
const statusEl = root.querySelector<HTMLParagraphElement>(".profile-status");

if (
  !burger ||
  !overlay ||
  !drawer ||
  !petOverlay ||
  !petPopup ||
  !petGrid ||
  !petPopupClose ||
  !petPopupIconClose ||
  !nameEl ||
  !languageEl ||
  !heroAvatar ||
  !editButton ||
  !statsList ||
  !achievementsList ||
  !statusEl
) {
  throw new Error("Missing profile controls");
}

statusEl.style.textAlign = "center";
statusEl.style.color = "#1d2359";
statusEl.style.fontWeight = "600";
statusEl.style.marginTop = "12px";
let activePetId = "pet-1";
const ownedPetIds = new Set<string>(["pet-1"]);

const petAvatarById: Record<string, string> = {
  "pet-1": profileConfig.assets.heroAvatar,
  "pet-2": "/assets/images/customization/pet-2.png",
  "pet-3": "/assets/images/customization/pet-3.png",
  "pet-4": "/assets/images/customization/pet-4.png",
  "pet-5": "/assets/images/customization/pet-5.png",
  "pet-6": "/assets/images/customization/pet-6.png",
  "pet-7": "/assets/images/customization/pet-7.png",
  "pet-8": "/assets/images/customization/pet-8.png",
  "pet-9": "/assets/images/customization/pet-9.png",
};

const petPickerItems = [
  { id: "pet-1", image: petAvatarById["pet-1"] },
  { id: "pet-2", image: petAvatarById["pet-2"] },
  { id: "pet-3", image: petAvatarById["pet-3"] },
  { id: "pet-4", image: petAvatarById["pet-4"] },
  { id: "pet-5", image: petAvatarById["pet-5"] },
  { id: "pet-6", image: petAvatarById["pet-6"] },
  { id: "pet-7", image: petAvatarById["pet-7"] },
  { id: "pet-8", image: petAvatarById["pet-8"] },
  { id: "pet-9", image: petAvatarById["pet-9"] },
] as const;

const languageLabelByCode: Record<string, string> = {
  ru: "Русский",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  tr: "Türkçe",
  uk: "Українська",
};

const toLanguageLabel = (value: string | null | undefined): string => {
  if (!value) return "English";
  const normalized = value.trim().toLowerCase();
  return languageLabelByCode[normalized] ?? normalized.toUpperCase();
};

const pluralizeRu = (count: number, one: string, few: string, many: string): string => {
  const abs = Math.abs(count) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
};

const isPetOwned = (petId: string): boolean => ownedPetIds.has(petId);

const renderPetPicker = (): void => {
  petGrid.innerHTML = petPickerItems
    .map((pet) => {
      const owned = isPetOwned(pet.id);
      const active = activePetId === pet.id;
      return `
        <button
          type="button"
          class="profile-pet-card${owned ? "" : " profile-pet-card--locked"}${active ? " profile-pet-card--active" : ""}"
          data-pet-id="${pet.id}"
          ${owned ? "" : "disabled"}
        >
          <img class="profile-pet-card-image" src="${pet.image}" alt="" />
          <span class="profile-pet-card-meta">${owned ? (active ? "Выбран" : "Открыт") : "15"}</span>
        </button>
      `;
    })
    .join("");
};

const setHeroAvatarByPet = (petId: string | null | undefined, fallbackAvatar?: string | null): void => {
  if (petId && petAvatarById[petId]) {
    heroAvatar.src = petAvatarById[petId];
    return;
  }
  if (fallbackAvatar) {
    heroAvatar.src = fallbackAvatar;
    return;
  }
  heroAvatar.src = profileConfig.assets.heroAvatar;
};

const openDrawer = (): void => {
  root.classList.add("is-drawer-open");
  overlay.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
};

const closeDrawer = (): void => {
  root.classList.remove("is-drawer-open");
  overlay.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
};

const openPetPopup = (): void => {
  renderPetPicker();
  root.classList.add("is-pet-popup-open");
  petOverlay.hidden = false;
  petPopup.setAttribute("aria-hidden", "false");
};

const closePetPopup = (): void => {
  root.classList.remove("is-pet-popup-open");
  petOverlay.hidden = true;
  petPopup.setAttribute("aria-hidden", "true");
};

const normalizePath = (path: string): string => path.replace(/\/+$/, "") || "/";

burger.addEventListener("click", () => {
  if (root.classList.contains("is-drawer-open")) {
    closeDrawer();
    return;
  }
  openDrawer();
});

overlay.addEventListener("click", closeDrawer);
petOverlay.addEventListener("click", closePetPopup);
petPopupClose.addEventListener("click", closePetPopup);
petPopupIconClose.addEventListener("click", closePetPopup);

drawerLinks.forEach((link) =>
  link.addEventListener("click", () => {
    const href = link.dataset.itemHref?.trim();
    if (href) {
      const targetPath = normalizePath(new URL(href, window.location.origin).pathname);
      const currentPath = normalizePath(window.location.pathname);
      if (targetPath !== currentPath) {
        window.location.href = href;
        return;
      }
    }
    closeDrawer();
  }),
);

const setStatus = (text: string, visible = true): void => {
  statusEl.hidden = !visible;
  statusEl.textContent = text;
};

petGrid.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  const button = target?.closest<HTMLButtonElement>(".profile-pet-card");
  const petId = button?.dataset.petId;
  if (!button || !petId || button.disabled) return;
  if (!isPetOwned(petId)) return;
  if (petId === activePetId) {
    closePetPopup();
    return;
  }

  try {
    setStatus("Сохраняем выбранного чудика...");
    const updated = await profileApi.patchProfile({ activePetId: petId });
    activePetId = updated.profile.activePetId ?? "pet-1";
    ownedPetIds.clear();
    (updated.profile.ownedPetIds ?? []).forEach((ownedPetId) => ownedPetIds.add(ownedPetId));
    ownedPetIds.add("pet-1");
    setHeroAvatarByPet(activePetId, updated.profile.avatar);
    renderPetPicker();
    closePetPopup();
    setStatus("Чудик обновлен", true);
  } catch (error) {
    setStatus(error instanceof ApiError ? error.message : "Не удалось обновить чудика", true);
  }
});

const renderRuntimeStats = (summary: { currentStreak: number; totalXp: number; achievements: Array<unknown> }): void => {
  const daysWord = pluralizeRu(summary.currentStreak, "день", "дня", "дней");
  const achievementsWord = pluralizeRu(summary.achievements.length, "достижение", "достижения", "достижений");

  const runtimeStats: ProfileStatItem[] = [
    { id: "streak", icon: "/assets/images/profile/stat-streak.svg", value: String(summary.currentStreak), suffix: `${daysWord} подряд` },
    { id: "xp", icon: "/assets/images/profile/stat-xp.svg", value: String(summary.totalXp), suffix: "набрано опыта" },
    {
      id: "levels",
      icon: "/assets/images/profile/stat-level.png",
      value: String(summary.achievements.length),
      suffix: `${achievementsWord} открыто`,
    },
  ];

  statsList.innerHTML = runtimeStats.map(renderStat).join("");
};

const renderRuntimeAchievements = (summary: { achievements: Array<{ id: number; name: string; description: string }> }): void => {
  if (summary.achievements.length === 0) {
    achievementsList.innerHTML = `
      <article class="profile-achievement profile-achievement--highlighted">
        <img class="profile-achievement-icon" src="/assets/images/profile/ach-fan.png" alt="" />
        <div class="profile-achievement-copy">
          <p class="profile-achievement-title">Пока нет достижений</p>
          <p class="profile-achievement-text">Завершите несколько упражнений, чтобы открыть первые награды.</p>
        </div>
      </article>
    `;
    return;
  }

  achievementsList.innerHTML = summary.achievements
    .map((item) =>
      renderAchievement({
        id: String(item.id),
        icon: "/assets/images/profile/ach-fan.png",
        title: item.name,
        description: item.description,
        highlighted: true,
      }),
    )
    .join("");
};

const loadProfileData = async (): Promise<void> => {
  try {
    setStatus("Загружаем профиль...");
    const [profileData, summary] = await Promise.all([profileApi.getProfile(), progressApi.getSummary()]);

    nameEl.textContent = profileData.profile.name;

    const siteLanguageCode = profileData.profile.preferredLanguage || profileData.profile.learningLanguage;
    languageEl.textContent = toLanguageLabel(siteLanguageCode);

    activePetId = profileData.profile.activePetId ?? "pet-1";
    ownedPetIds.clear();
    (profileData.profile.ownedPetIds ?? []).forEach((petId) => ownedPetIds.add(petId));
    ownedPetIds.add("pet-1");
    setHeroAvatarByPet(activePetId, profileData.profile.avatar);
    renderPetPicker();

    renderRuntimeStats(summary);
    renderRuntimeAchievements(summary);

    const report = await progressApi.getReport();
    const reportText =
      typeof report === "object" && report && "summary" in report
        ? String((report as { summary?: string }).summary ?? "")
        : "";
    setStatus(reportText || "Профиль обновлен", true);
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Не удалось загрузить профиль";
    setStatus(message, true);
  }
};

editButton.addEventListener("click", () => {
  openPetPopup();
});

renderPetPicker();

void ensureSession().then(() => {
  void loadProfileData();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (root.classList.contains("is-pet-popup-open")) {
    closePetPopup();
    return;
  }
  closeDrawer();
});
