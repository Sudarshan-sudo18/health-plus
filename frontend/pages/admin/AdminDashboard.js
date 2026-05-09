import { AppLayout } from "/components/layout.js";
import {
  BookingTable,
  DataTable,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  StatusBadge,
  escapeHtml,
  formatCurrency,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";

export const AdminDashboard = {
  title: "Health Plus | Admin",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Admin Dashboard",
      subtitle: "Approve doctor profiles, manage provider access, and oversee platform bookings.",
      children: `<div id="adminContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate }, root) {
    loadAdminDashboard(root, navigate);
  }
};

async function loadAdminDashboard(root, navigate) {
  const content = root.querySelector("#adminContent");
  content.innerHTML = LoadingState("Loading doctor approvals and bookings...");

  try {
    const [doctorData, bookingData] = await Promise.all([
      apiFetch("/api/admin/doctors"),
      apiFetch("/api/admin/bookings")
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
  const pendingDoctors = data.doctors.filter((doctor) => !doctor.isApproved).length;
  const activeDoctors = data.doctors.filter((doctor) => doctor.isApproved && doctor.isActive !== false).length;
  const activeBookings = data.bookings.filter((booking) => booking.status !== "cancelled").length;
  const unpaidBookings = data.bookings.filter((booking) => booking.paymentStatus === "pending").length;

  return `
    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Active doctors", value: String(activeDoctors), note: "Approved and visible" })}
      ${MetricCard({ icon: "icon-user", label: "Pending review", value: String(pendingDoctors), note: "Awaiting admin action" })}
      ${MetricCard({ icon: "icon-calendar", label: "Active bookings", value: String(activeBookings), note: "Not cancelled" })}
      ${MetricCard({ icon: "icon-report", label: "Payment pending", value: String(unpaidBookings), note: "Can be waived by admin" })}
    </section>

    <div class="dashboard-grid admin-dashboard-grid">
      ${Panel({
        eyebrow: "Approval queue",
        title: "Doctor profiles",
        children: renderDoctorApprovalTable(data.doctors)
      })}

      ${Panel({
        eyebrow: "Booking control",
        title: "Bookings",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "admin",
          actions: (row) => `
            <div class="inline-actions">
              <button class="small-button danger-button" type="button" data-admin-cancel-booking="${escapeHtml(row.id)}" ${row.status === "cancelled" ? "disabled" : ""}>
                ${row.status === "cancelled" ? "Cancelled" : "Cancel"}
              </button>
              <button class="small-button" type="button" data-waive-booking="${escapeHtml(row.id)}" ${row.paymentStatus === "waived" ? "disabled" : ""}>
                ${row.paymentStatus === "waived" ? "Waived" : "Waive payment"}
              </button>
            </div>
          `
        })
      })}
    </div>
  `;
}

function renderDoctorApprovalTable(doctors) {
  return DataTable({
    columns: [
      {
        label: "Doctor",
        key: "fullName",
        render: (row) => `
          <strong>${escapeHtml(row.fullName)}</strong>
          <span class="muted-cell">${escapeHtml(row.email)}</span>
        `
      },
      {
        label: "Practice",
        key: "specialization",
        render: (row) => `
          ${escapeHtml(row.specialization)}
          <span class="muted-cell">${escapeHtml(row.qualification)} &middot; ${escapeHtml(String(row.yearsOfExperience))} years</span>
        `
      },
      { label: "Fee", key: "consultationFee", render: (row) => formatCurrency(row.consultationFee) },
      {
        label: "Status",
        key: "status",
        render: (row) => `
          ${StatusBadge(row.rejectionReason ? "rejected" : row.isActive ? (row.isApproved ? "approved" : "pending") : "inactive")}
          ${row.rejectionReason ? `<span class="muted-cell">${escapeHtml(row.rejectionReason)}</span>` : ""}
        `
      },
      {
        label: "Action",
        key: "id",
        render: (row) => `
          <div class="admin-action-stack">
            <div class="inline-actions">
              <button class="small-button" type="button" data-approve-doctor="${escapeHtml(row.id)}" ${row.isApproved && row.isActive ? "disabled" : ""}>Approve</button>
              <button class="small-button danger-button" type="button" data-deactivate-doctor="${escapeHtml(row.id)}" ${!row.isActive ? "disabled" : ""}>Deactivate</button>
              <button class="small-button danger-button" type="button" data-delete-doctor="${escapeHtml(row.id)}">Remove</button>
            </div>
            <div class="reject-row">
              <input data-reject-reason="${escapeHtml(row.id)}" placeholder="Rejection reason">
              <button class="small-button danger-button" type="button" data-reject-doctor="${escapeHtml(row.id)}">Reject</button>
            </div>
          </div>
        `
      }
    ],
    rows: doctors,
    emptyText: "No doctor profiles have been submitted yet."
  });
}

function bindAdminActions(root, navigate) {
  root.querySelectorAll("[data-approve-doctor]").forEach((button) => {
    button.addEventListener("click", async () => {
      await runAdminAction(root, navigate, async () => {
        await apiFetch(`/api/admin/doctors/${button.dataset.approveDoctor}/approve`, { method: "PATCH" });
        toast("Doctor approved.");
      });
    });
  });

  root.querySelectorAll("[data-reject-doctor]").forEach((button) => {
    button.addEventListener("click", async () => {
      const reason = root.querySelector(`[data-reject-reason="${cssEscape(button.dataset.rejectDoctor)}"]`)?.value || "";

      if (!reason.trim()) {
        toast("Enter a rejection reason.");
        return;
      }

      if (!window.confirm("Reject this doctor profile?")) {
        return;
      }

      await runAdminAction(root, navigate, async () => {
        await apiFetch(`/api/admin/doctors/${button.dataset.rejectDoctor}/reject`, {
          method: "PATCH",
          body: { reason }
        });
        toast("Doctor rejected.");
      });
    });
  });

  root.querySelectorAll("[data-deactivate-doctor]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Deactivate this doctor profile?")) {
        return;
      }

      await runAdminAction(root, navigate, async () => {
        await apiFetch(`/api/admin/doctors/${button.dataset.deactivateDoctor}/deactivate`, { method: "PATCH" });
        toast("Doctor deactivated.");
      });
    });
  });

  root.querySelectorAll("[data-delete-doctor]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Remove this doctor profile?")) {
        return;
      }

      await runAdminAction(root, navigate, async () => {
        await apiFetch(`/api/admin/doctors/${button.dataset.deleteDoctor}`, { method: "DELETE" });
        toast("Doctor profile removed.");
      });
    });
  });

  root.querySelectorAll("[data-admin-cancel-booking]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!window.confirm("Cancel this booking?")) {
        return;
      }

      await runAdminAction(root, navigate, async () => {
        await apiFetch(`/api/admin/bookings/${button.dataset.adminCancelBooking}/cancel`, {
          method: "PATCH",
          body: { reason: "Cancelled by admin" }
        });
        toast("Booking cancelled.");
      });
    });
  });

  root.querySelectorAll("[data-waive-booking]").forEach((button) => {
    button.addEventListener("click", async () => {
      await runAdminAction(root, navigate, async () => {
        await apiFetch(`/api/admin/bookings/${button.dataset.waiveBooking}/waive-payment`, { method: "PATCH" });
        toast("Payment waived.");
      });
    });
  });
}

async function runAdminAction(root, navigate, action) {
  try {
    await action();
    loadAdminDashboard(root, navigate);
  } catch (error) {
    toast(error.message);
    if (error.status === 401 || error.status === 403) {
      navigate("/login");
    }
  }
}

function bindRetry(root, navigate) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadAdminDashboard(root, navigate);
  });
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return String(value).replaceAll('"', '\\"');
}
