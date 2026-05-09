import { AppLayout } from "/components/layout.js";
import { BookingTable, ErrorState, LoadingState, MetricCard, Panel, escapeHtml, toast } from "/components/ui.js";
import { apiFetch } from "/services/api.js";

export const DoctorDashboard = {
  title: "Health Plus | Doctor",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Doctor Dashboard",
      subtitle: "View your patient bookings from the protected booking API.",
      children: `<div id="doctorContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate, session }, root) {
    loadDoctorDashboard(root, navigate, session);
  }
};

async function loadDoctorDashboard(root, navigate, session) {
  const content = root.querySelector("#doctorContent");
  content.innerHTML = LoadingState("Loading your bookings...");

  try {
    const data = await apiFetch("/api/bookings/my");
    content.innerHTML = renderDoctorData({
      bookings: data.bookings || [],
      user: session?.user
    });
    bindDoctorActions(root, navigate, session);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      toast("Please log in again.");
      navigate("/login");
      return;
    }

    content.innerHTML = ErrorState(error.message);
    bindRetry(root, navigate, session);
  }
}

function renderDoctorData(data) {
  const pendingBookings = data.bookings.filter((booking) => booking.status === "pending").length;
  const confirmedBookings = data.bookings.filter((booking) => booking.status === "confirmed").length;
  const patientIds = new Set(
    data.bookings
      .map((booking) => (typeof booking.patientId === "object" && booking.patientId ? booking.patientId._id || booking.patientId.id : booking.patientId))
      .filter(Boolean)
  );

  return `
    <section class="doctor-profile-band">
      <div>
        <p class="eyebrow">Doctor workspace</p>
        <h2>${escapeHtml(data.user?.name || "Doctor")}</h2>
        <p>${escapeHtml(data.user?.email || "Review your assigned Health Plus bookings.")}</p>
      </div>
      <div class="profile-summary">
        <span>Bookings are pulled from the protected booking API and matched to your doctor account.</span>
      </div>
    </section>

    <section class="metric-grid">
      ${MetricCard({ icon: "icon-calendar", label: "Bookings", value: String(data.bookings.length), note: "Visible only to this doctor" })}
      ${MetricCard({ icon: "icon-user", label: "Patients", value: String(patientIds.size), note: "With active or past visits" })}
      ${MetricCard({ icon: "icon-video", label: "Confirmed", value: String(confirmedBookings), note: "Ready for consultation" })}
      ${MetricCard({ icon: "icon-report", label: "Pending", value: String(pendingBookings), note: "Awaiting confirmation or payment" })}
    </section>

    <div class="dashboard-grid">
      ${Panel({
        eyebrow: "Appointments",
        title: "Your bookings",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "doctor"
        })
      })}
    </div>
  `;
}

function bindDoctorActions(root, navigate, session) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadDoctorDashboard(root, navigate, session);
  });
}

function bindRetry(root, navigate, session) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadDoctorDashboard(root, navigate, session);
  });
}
