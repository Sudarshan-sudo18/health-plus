import { canAccess, getDashboardForRole, getSession } from "/auth/auth.js";
import { bindLayoutActions } from "/components/layout.js";
import { LoginPage } from "/pages/LoginPage.js";
import { AdminDashboard } from "/pages/admin/AdminDashboard.js";
import { DoctorDashboard } from "/pages/doctor/DoctorDashboard.js";
import { PatientDashboard } from "/pages/patient/PatientDashboard.js";

let appRoot = null;

const routes = [
  { path: "/", page: LoginPage, public: true },
  { path: "/login", page: LoginPage, public: true },
  { path: "/admin", page: AdminDashboard, role: "admin" },
  { path: "/doctor", page: DoctorDashboard, role: "doctor" },
  { path: "/patient", page: PatientDashboard, role: "patient" }
];

export function startRouter(root) {
  appRoot = root;
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("popstate", renderRoute);
  renderRoute();
}

export function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  }
  renderRoute();
}

export function renderRoute() {
  const route = findRoute(window.location.pathname);
  const session = getSession();

  if (!route) {
    navigate("/login");
    return;
  }

  if (!route.public && !canAccess(route.path, session)) {
    const denied = encodeURIComponent(route.path);
    window.history.replaceState({}, "", `/login?denied=${denied}`);
  }

  const nextRoute = findRoute(window.location.pathname) || routes[1];
  const activeSession = getSession();

  if (nextRoute.public && activeSession && window.location.pathname === "/") {
    navigate(getDashboardForRole(activeSession.role));
    return;
  }

  const context = {
    navigate,
    session: activeSession,
    path: nextRoute.path,
    query: new URLSearchParams(window.location.search)
  };

  appRoot.innerHTML = nextRoute.page.render(context);
  bindLayoutActions(appRoot);
  if (nextRoute.page.afterRender) {
    nextRoute.page.afterRender(context, appRoot);
  }
  document.title = nextRoute.page.title || "Health Plus";
}

function findRoute(pathname) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return routes.find((route) => route.path === normalized);
}

function handleDocumentClick(event) {
  const link = event.target.closest("[data-link]");
  if (!link) return;
  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  navigate(url.pathname);
}
