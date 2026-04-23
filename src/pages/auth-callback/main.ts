import "../../shared/styles/base.css";
import "./auth-callback.css";
import { sessionStorageApi } from "../../shared/api";
import type { SessionUser } from "../../shared/api";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app container");

const root = document.createElement("main");
root.className = "auth-callback";
root.innerHTML = `
  <section class="auth-callback-card">
    <h1 class="auth-callback-title">Triolingo</h1>
    <p class="auth-callback-status">Processing sign-in...</p>
    <a class="auth-callback-link" href="/second.html" hidden>Back to sign in</a>
  </section>
`;
app.append(root);

const statusEl = root.querySelector<HTMLParagraphElement>(".auth-callback-status");
const retryLink = root.querySelector<HTMLAnchorElement>(".auth-callback-link");

if (!statusEl || !retryLink) {
  throw new Error("Missing callback controls");
}

const decodeBase64UrlJson = <T>(value: string): T => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const json = atob(normalized);
  return JSON.parse(json) as T;
};

const params = new URLSearchParams(window.location.hash.slice(1));
const token = params.get("token");
const userEncoded = params.get("user");
const error = params.get("error");

if (error) {
  statusEl.textContent = `OAuth error: ${error}`;
  retryLink.hidden = false;
} else if (!token || !userEncoded) {
  statusEl.textContent = "Could not get session data.";
  retryLink.hidden = false;
} else {
  try {
    const user = decodeBase64UrlJson<SessionUser>(userEncoded);
    sessionStorageApi.setToken(token);
    sessionStorageApi.setUser(user);
    statusEl.textContent = "Sign-in successful. Redirecting...";
    window.setTimeout(() => {
      window.location.href = "/third.html";
    }, 650);
  } catch {
    statusEl.textContent = "Could not process OAuth response.";
    retryLink.hidden = false;
  }
}
