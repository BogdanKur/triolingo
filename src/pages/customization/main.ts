import "../../shared/styles/base.css";
import "./customization.css";
import { ApiError, storeApi } from "../../shared/api";
import { ensureSession } from "../../shared/api/guards";
import type { CustomizationCard, CustomizationSection, PurchasePopup } from "../../shared/types/customization";
import { customizationConfig } from "./config";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const root = document.createElement("main");
root.className = "customization-screen";
root.style.setProperty("--bg-image", `url("${customizationConfig.assets.bg}")`);

const renderCard = (card: CustomizationCard): string => `
  <button class="custom-card custom-card--${card.kind}" type="button" data-id="${card.id}">
    <div class="custom-card-image-wrap">
      <img class="custom-card-image" src="${card.image}" alt="${card.alt}" />
    </div>
    <div class="custom-card-price-wrap">
      <div class="custom-card-price-row">
        <span class="custom-card-price">${card.price}</span>
        ${
          card.currency === "crystal"
            ? `<img class="custom-card-crystal" src="${card.crystalIcon}" alt="" />`
            : `<span class="custom-card-currency">${card.currency === "rub" ? "\u20bd" : ""}</span>`
        }
      </div>
      ${card.cashPrice ? `<p class="custom-card-cash">${card.cashPrice}</p>` : ""}
    </div>
  </button>
`;

const renderSection = (section: CustomizationSection): string => `
  <section class="custom-section" data-id="${section.id}">
    <h2 class="custom-section-title">${section.title}</h2>
    <div class="custom-grid">
      ${section.cards.map(renderCard).join("")}
    </div>
  </section>
`;

const sectionsMarkup = customizationConfig.sections.map(renderSection).join("");

const drawerItemsMarkup = customizationConfig.drawerItems
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
        <img class="drawer-line" src="${customizationConfig.assets.drawerLine}" alt="" />
      </li>
    `,
  )
  .join("");

root.innerHTML = `
  <header class="custom-header">
    <div class="custom-header-inner">
      <div class="custom-brand">
        <img class="custom-brand-mascot" src="${customizationConfig.assets.mascot}" alt="" />
        <p class="custom-brand-text">${customizationConfig.texts.brand}</p>
      </div>
      <h1 class="custom-title">${customizationConfig.texts.pageTitle}</h1>
      <button class="custom-burger" type="button" aria-label="${customizationConfig.texts.burgerAriaLabel}">
        <img src="${customizationConfig.assets.burger}" alt="" />
      </button>
    </div>
  </header>

  <div class="purchase-success" hidden role="status" aria-live="polite">
    <p class="purchase-success-text">${customizationConfig.texts.purchaseSuccess}</p>
    <button class="purchase-success-close" type="button" aria-label="Close purchase success">X</button>
  </div>

  <section class="custom-main">
    <div class="custom-scroll">
      ${sectionsMarkup}
    </div>
  </section>

  <div class="drawer-overlay" hidden></div>
  <aside class="drawer" aria-hidden="true">
    <header class="drawer-head">
      <img class="drawer-head-icon" src="${customizationConfig.assets.mascot}" alt="" />
      <p class="drawer-head-title">${customizationConfig.texts.brand}</p>
    </header>
    <ul class="drawer-list">${drawerItemsMarkup}</ul>
  </aside>

  <div class="purchase-overlay" hidden></div>
  <aside class="purchase-popup" aria-hidden="true">
    <div class="purchase-popup-inner">
      <img class="purchase-item-image" src="" alt="" />
      <div class="purchase-price-row">
        <span class="purchase-crystal-price"></span>
        <img class="purchase-crystal-icon" src="${customizationConfig.assets.popupCrystal}" alt="" />
      </div>
      <p class="purchase-cash-price"></p>
      <div class="purchase-actions">
        <button class="purchase-btn purchase-btn--cancel" type="button">${customizationConfig.texts.popupCancel}</button>
        <button class="purchase-btn purchase-btn--buy" type="button">${customizationConfig.texts.popupBuy}</button>
      </div>
    </div>
  </aside>
`;

app.append(root);

const burger = root.querySelector<HTMLButtonElement>(".custom-burger");
const overlay = root.querySelector<HTMLDivElement>(".drawer-overlay");
const drawer = root.querySelector<HTMLElement>(".drawer");
const drawerLinks = root.querySelectorAll<HTMLButtonElement>(".drawer-link");
const cards = root.querySelectorAll<HTMLButtonElement>(".custom-card");
const purchaseOverlay = root.querySelector<HTMLDivElement>(".purchase-overlay");
const purchasePopup = root.querySelector<HTMLElement>(".purchase-popup");
const purchaseImage = root.querySelector<HTMLImageElement>(".purchase-item-image");
const purchaseCrystalPrice = root.querySelector<HTMLSpanElement>(".purchase-crystal-price");
const purchaseCashPrice = root.querySelector<HTMLParagraphElement>(".purchase-cash-price");
const purchaseCancelButton = root.querySelector<HTMLButtonElement>(".purchase-btn--cancel");
const purchaseBuyButton = root.querySelector<HTMLButtonElement>(".purchase-btn--buy");
const purchaseSuccess = root.querySelector<HTMLDivElement>(".purchase-success");
const purchaseSuccessClose = root.querySelector<HTMLButtonElement>(".purchase-success-close");

if (
  !burger ||
  !overlay ||
  !drawer ||
  !purchaseOverlay ||
  !purchasePopup ||
  !purchaseImage ||
  !purchaseCrystalPrice ||
  !purchaseCashPrice ||
  !purchaseCancelButton ||
  !purchaseBuyButton ||
  !purchaseSuccess ||
  !purchaseSuccessClose
) {
  throw new Error("Missing drawer controls");
}

let purchaseSuccessTimer: number | null = null;
let purchaseSuccessFadeTimer: number | null = null;
let activePopup: PurchasePopup | null = null;
let activeCardId: string | null = null;
const ownedPetIds = new Set<string>(["pet-1"]);

const popupByCardId = new Map<string, PurchasePopup>();
customizationConfig.purchasePopups.forEach((popup) => {
  popup.triggerCardIds.forEach((cardId) => {
    popupByCardId.set(cardId, popup);
  });
});

const isPetCardId = (cardId: string): boolean => /^pet-[1-9]$/.test(cardId);

const applyOwnedStateToCards = (): void => {
  cards.forEach((card) => {
    const cardId = card.dataset.id ?? "";
    const owned = isPetCardId(cardId) && ownedPetIds.has(cardId);
    card.classList.toggle("custom-card--owned", owned);
    card.disabled = owned;
  });
};

applyOwnedStateToCards();

const clearPurchaseSuccessTimers = (): void => {
  if (purchaseSuccessTimer !== null) {
    window.clearTimeout(purchaseSuccessTimer);
    purchaseSuccessTimer = null;
  }

  if (purchaseSuccessFadeTimer !== null) {
    window.clearTimeout(purchaseSuccessFadeTimer);
    purchaseSuccessFadeTimer = null;
  }
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

const openPopup = (popup: PurchasePopup, cardId: string): void => {
  activePopup = popup;
  activeCardId = cardId;
  purchaseImage.src = popup.image;
  purchaseImage.alt = popup.alt;
  purchaseCrystalPrice.textContent = popup.crystalPrice;
  purchaseCashPrice.textContent = popup.cashPrice ?? "";
  purchaseCashPrice.hidden = !popup.cashPrice;
  purchasePopup.dataset.popupId = popup.id;

  root.style.setProperty("--popup-accent", popup.accentColor);
  root.classList.add("is-popup-open");
  purchaseOverlay.hidden = false;
  purchasePopup.setAttribute("aria-hidden", "false");
};

const closePopup = (): void => {
  root.classList.remove("is-popup-open");
  purchaseOverlay.hidden = true;
  purchasePopup.setAttribute("aria-hidden", "true");
  activePopup = null;
  activeCardId = null;
  delete purchasePopup.dataset.popupId;
};

const hidePurchaseSuccess = (): void => {
  clearPurchaseSuccessTimers();
  root.classList.remove("is-success-visible", "is-success-fading");
  purchaseSuccess.hidden = true;
};

const showPurchaseSuccess = (): void => {
  clearPurchaseSuccessTimers();
  purchaseSuccess.hidden = false;
  root.classList.remove("is-success-visible", "is-success-fading");

  void purchaseSuccess.offsetWidth;

  root.classList.add("is-success-visible");

  purchaseSuccessTimer = window.setTimeout(() => {
    root.classList.add("is-success-fading");

    purchaseSuccessFadeTimer = window.setTimeout(() => {
      hidePurchaseSuccess();
    }, 320);
  }, 2000);
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

cards.forEach((card) =>
  card.addEventListener("click", () => {
    if (card.disabled) return;
    const cardId = card.dataset.id;
    const popup = (cardId && popupByCardId.get(cardId)) ?? customizationConfig.purchasePopups[0];
    if (!popup || !cardId) return;
    openPopup(popup, cardId);
  }),
);

purchaseOverlay.addEventListener("click", closePopup);
purchaseCancelButton.addEventListener("click", closePopup);
purchaseBuyButton.addEventListener("click", async () => {
  const popup = activePopup;
  const cardId = activeCardId;
  if (!popup || !cardId) return;

  try {
    const itemType = cardId.startsWith("crystal-pack") ? "crystal-pack" : "pet";
    const currency = popup.cashPrice ? "rub" : "crystal";
    await storeApi.purchase({
      itemType,
      itemId: cardId,
      amount: Number(popup.crystalPrice) || 15,
      currency,
    });

    if (itemType === "pet") {
      ownedPetIds.add(cardId);
      applyOwnedStateToCards();
    }

    closePopup();
    showPurchaseSuccess();
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Не удалось выполнить покупку";
    alert(message);
  }
});
purchaseSuccessClose.addEventListener("click", hidePurchaseSuccess);

void ensureSession().then(async () => {
  try {
    const catalog = await storeApi.getCatalog();
    (catalog.ownedPetIds ?? []).forEach((petId) => {
      if (isPetCardId(petId)) {
        ownedPetIds.add(petId);
      }
    });
    applyOwnedStateToCards();
  } catch {
    applyOwnedStateToCards();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (root.classList.contains("is-popup-open")) {
    closePopup();
    return;
  }

  if (root.classList.contains("is-success-visible")) {
    hidePurchaseSuccess();
    return;
  }

  closeDrawer();
});

