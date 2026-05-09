import { AppLayout } from "/components/layout.js";
import {
  BookingTable,
  DoctorAvailabilityCard,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  escapeHtml,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";

export const AdminDashboard = {
  title: "Health Plus | Admin",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Admin Dashboard",
      subtitle: "Review approved doctors, approve provider records when returned by the API, and manage bookings.",
      children: `<div id="adminContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate }, root) {
    loadAdminDashboard(root, navigate);
  }
};

async function loadAdminDashboard(root, navigate) {
  const content = root.querySelector("#adminContent");
  content.innerHTML = LoadingState("Loading doctors and bookings...");

  try {
    const [doctorData, bookingData] = await Promise.all([
      apiFetch("/api/doctors"),
      apiFetch("/api/bookings/my")
    ]);

    content.innerHTML = renderAdminData({
      doctors: doctorData.doctors || [],
      bookings: bookingData.bookings || []
    });
    bindAdminActions(root, navigate);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      toast("Please log in again.");
      navigate("/login");
      return;
    }

    content.innerHTML = ErrorState(error.message);
    bindRetry(root, navigate);
  }
}

function renderAdminData(data) {
  const pendingBookings = data.bookings.filter((booking) => booking.status === "pending").length;
  const activeBookings = data.bookings.filter((booking) => booking.status !== "cancelled").length;

  return `
    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Doctors", value: String(data.doctors.length), note: "Approved doctor records" })}
      ${MetricCard({ icon: "icon-calendar", label: "Bookings", value: String(data.bookings.length), note: "Across all patients" })}
      ${MetricCard({ icon: "icon-video", label: "Active", value: String(activeBookings), note: "Not cancelled" })}
      ${MetricCard({ icon: "icon-report", label: "Pending", value: String(pendingBookings), note: "Awaiting confirmation or payment" })}
    </section>

    <div class="dashboard-grid admin-dashboard-grid">
      ${Panel({
        eyebrow: "Doctor approvals",
        title: "Doctors",
        children: `
          <div class="doctor-grid compact-grid availability-grid">
            ${
              data.doctors.length
                ? data.doctors
                    .map((doctor) => DoctorAvailabilityCard({ doctor, selectedDate: new Date().toISOString().slice(0, 10), mode: "admin" }))
                    .join("")
                : `<div class="empty-state">No doctor records returned by the API.</div>`
            }
          </div>
        `
      })}

      ${Panel({
        eyebrow: "Booking control",
        title: "Bookings",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "admin",
          actions: (row) => `
            <button class="small-button danger-button" type="button" data-cancel-booking="${escapeHtml(row.id)}" ${row.status === "cancelled" ? "disabled" : ""}>
              ${row.status === "cancelled" ? "Cancelled" : "Cancel"}
            </button>
          `
        })
      })}
    </div>
  `;
}

function bindAdminActions(root, navigate) {
  root.querySelectorAll("[data-approve-doctor]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiFetch(`/api/doctors/${button.dataset.approveDoctor}/approve`, {
          method: "PATCH"
        });
        toast("Doctor approved.");
        loadAdminDashboard(root, navigate);
      } catch (error) {
        toast(error.message);
        if (error.status === 401 || error.status === 403) {
          navigate("/login");
        }
      }
    });
  });

  root.querySelectorAll("[data-cancel-booking]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiFetch(`/api/bookings/${button.dataset.cancelBooking}/cancel`, {
          method: "PATCH"
        });
        toast("Booking cancelled.");
        loadAdminDashboard(root, navigate);
      } catch (error) {
        toast(error.message);
        if (error.status === 401 || error.status === 403) {
          navigate("/login");
        }
      }
    });
  });
}

function bindRetry(root, navigate) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadAdminDashboard(root, navigate);
  });
}
