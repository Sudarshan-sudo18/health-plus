import {
  acceptTerms,
  getAccessToken,
  getDashboardForRole,
  getSession,
  logout,
  refreshMe,
  requiresEmailVerification
} from "/auth/auth.js";
import { resolvePortalRoute } from "/config/portals.js";
import { bindLayoutActions } from "/components/layout.js";
import { bindTermsConsent, TermsConsentModal } from "/components/terms.js";
import { toast } from "/components/ui.js";
import { LoginPage } from "/pages/LoginPage.js";
import { SignupPage } from "/pages/SignupPage.js";
import { VerifyEmailPage } from "/pages/VerifyEmailPage.js";
import { ForgotPasswordPage } from "/pages/ForgotPasswordPage.js";
import { ResetPasswordPage } from "/pages/ResetPasswordPage.js";
import { LandingPage } from "/pages/LandingPage.js";
import { AdminDashboard } from "/pages/admin/AdminDashboard.js";
import { DoctorDashboard } from "/pages/doctor/DoctorDashboard.js";
import { PatientDashboard } from "/pages/patient/PatientDashboard.js";

let appRoot = null;

const routes = [
  { path: "/", page: LandingPage, public: true },
  { path: "/login", page: LoginPage, public: true },
  { path: "/signup", page: SignupPage, public: true },
  { path: "/forgot-password", page: ForgotPasswordPage, public: true },
  { path: "/reset-password", page: ResetPasswordPage, public: true },
  { path: "/verify-email", page: VerifyEmailPage, verification: true },
];

const dashboardPages = {
  admin: AdminDashboard,
  doctor: DoctorDashboard,
  patient: PatientDashboard
};

export function startRouter(root) {
  appRoot = root;
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("popstate", renderRoute);
  renderRoute();
}

export function navigate(path) {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath !== path) {
    window.history.pushState({}, "", path);
  }
  renderRoute();
}

export async function renderRoute() {
  const query = new URLSearchParams(window.location.search);
  const route = findRoute(window.location.pathname, query);

  if (!route) {
    replaceRoute("/login");
    return;
  }

  let activeSession = getSession(route.role);

  if (route.public) {
    activeSession = getSession();
    if (route.path === "/" && activeSession && getAccessToken(activeSession.role)) {
      appRoot.innerHTML = renderAuthLoading("Opening your workspace...");
      try {
        activeSession = await refreshMe(activeSession.role);
        if (requiresEmailVerification(activeSession.user)) {
          navigate(`/verify-email?role=${encodeURIComponent(activeSession.role)}`);
          return;
        }
        navigate(getDashboardForRole(activeSession.role));
      } catch {
        logout(activeSession?.role);
        navigate("/login");
      }
      return;
    }

    renderPage(route, activeSession);
    return;
  }

  if (route.verification) {
    await renderVerificationRoute();
    return;
  }

  appRoot.innerHTML = renderAuthLoading("Checking your access...");
  document.title = "Ārogyam";

  if (!activeSession || !getAccessToken(route.role)) {
    const denied = encodeURIComponent(route.path);
    replaceRoute(`/login?denied=${denied}`);
    return;
  }

  try {
    activeSession = await refreshMe(route.role);
  } catch {
    logout(route.role);
    toast("Please log in again.");
    replaceRoute("/login");
    return;
  }

  if (route.role && activeSession.role !== route.role) {
    replaceRoute(getDashboardForRole(activeSession.role));
    return;
  }

  if (requiresEmailVerification(activeSession.user)) {
    replaceRoute(`/verify-email?role=${encodeURIComponent(route.role)}`);
    return;
  }

  renderPage(route, activeSession);
  maybeBlockForTerms(activeSession);
}

function renderPage(route, activeSession) {
  const context = {
    navigate,
    session: activeSession,
    path: route.path,
    query: new URLSearchParams(window.location.search),
    section: route.section?.id,
    portal: route.portal || null
  };

  appRoot.innerHTML = route.page.render(context);
  bindLayoutActions(appRoot);
  if (route.page.afterRender) {
    route.page.afterRender(context, appRoot);
  }
  document.title = route.page.title || "Ārogyam";
}

function findRoute(pathname, query = new URLSearchParams()) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const staticRoute = routes.find((route) => route.path === normalized);
  if (staticRoute) return staticRoute;

  const portalRoute = resolvePortalRoute(normalized, query);
  if (!portalRoute?.section) return null;

  return {
    path: normalized,
    page: dashboardPages[portalRoute.role],
    role: portalRoute.role,
    section: portalRoute.section,
    portal: portalRoute.portal
  };
}

function replaceRoute(path) {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath === path) {
    return;
  }
  window.history.replaceState({}, "", path);
  renderRoute();
}

function renderAuthLoading(message) {
  return `
    <div class="auth-check-page">
      <section class="loading-panel" aria-live="polite">
        <div class="loading-state">
          <span class="spinner" aria-hidden="true"></span>
          <strong>${message}</strong>
        </div>
      </section>
    </div>
  `;
}

async function renderVerificationRoute() {
  appRoot.innerHTML = renderAuthLoading("Checking your verification status...");
  document.title = "Ārogyam";

  const query = new URLSearchParams(window.location.search);
  const requestedRole = query.get("role");
  let activeSession = getSession(requestedRole) || getSession();

  if (!activeSession || !getAccessToken(activeSession.role)) {
    replaceRoute("/login?verify=1");
    return;
  }

  try {
    activeSession = await refreshMe(activeSession.role);
  } catch {
    logout(activeSession?.role);
    toast("Please log in again.");
    replaceRoute("/login?verify=1");
    return;
  }

  if (!requiresEmailVerification(activeSession.user)) {
    replaceRoute(getDashboardForRole(activeSession.role));
    return;
  }

  renderPage(findRoute("/verify-email"), activeSession);
}

function maybeBlockForTerms(session) {
  if (!session?.user || session.user.termsAccepted === true || appRoot.querySelector("#termsConsentForm")) {
    return;
  }

  const dashboardFrame = appRoot.querySelector(".dashboard-app");
  if (dashboardFrame) {
    dashboardFrame.setAttribute("inert", "");
    dashboardFrame.setAttribute("aria-hidden", "true");
  }

  appRoot.insertAdjacentHTML("beforeend", TermsConsentModal(session.user));
  bindTermsConsent(appRoot, async () => {
    try {
      await acceptTerms(session.role);
      toast("Terms accepted. Welcome back.");
      renderRoute();
    } catch (error) {
      toast(error.message || "Could not save your acceptance. Please try again.");
      throw error;
    }
  });
}

function handleDocumentClick(event) {
  const link = event.target.closest("[data-link]");
  if (!link) return;
  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  navigate(`${url.pathname}${url.search}`);
}
