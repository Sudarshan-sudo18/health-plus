import { AppLayout, getActiveSection } from "/components/layout.js";
import {
  BookingTable,
  CompactList,
  DataTable,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  QuickActionGrid,
  StatusBadge,
  escapeHtml,
  formatCurrency,
  normalizeBooking,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";

const ADMIN_SECTIONS = ["overview", "doctors", "appointments", "payments"];

export const AdminDashboard = {
  title: "Health Plus | Admin",
  render({ path, query }) {
    const section = getActiveSection(query, ADMIN_SECTIONS);

    return AppLayout({
      activePath: path,
      activeSection: section,
      title: getAdminTitle(section),
      subtitle: getAdminSubtitle(section),
      children: `<div id="adminContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate, query }, root) {
    loadAdminDashboard(root, navigate, getActiveSection(query, ADMIN_SECTIONS));
  }
};

async function loadAdminDashboard(root, navigate, section) {
  const content = root.querySelector("#adminContent");
  content.innerHTML = LoadingState("Loading admin workspace...");

  try {
    const [doctorData, bookingData] = await Promise.all([
      apiFetch("/api/admin/doctors"),
      apiFetch("/api/admin/bookings")
    ]);

    content.innerHTML = renderAdminData({
      doctors: doctorData.doctors || [],
      bookings: bookingData.bookings || [],
      section
    });
    bindAdminActions(root, navigate, section);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      toast("Please log in again.");
      navigate("/login");
      return;
    }

    content.innerHTML = ErrorState(error.message);
    bindRetry(root, navigate, section);
  }
}

function renderAdminData(data) {
  const pendingDoctors = data.doctors.filter((doctor) => !doctor.isApproved).length;
  const activeDoctors = data.doctors.filter((doctor) => doctor.isApproved && doctor.isActive !== false).length;
  const activeBookings = data.bookings.filter((booking) => booking.status !== "cancelled").length;
  const unpaidBookings = data.bookings.filter((booking) => booking.paymentStatus === "pending").length;

  const metrics = `
    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Active doctors", value: String(activeDoctors), note: "Approved and visible" })}
      ${MetricCard({ icon: "icon-user", label: "Pending review", value: String(pendingDoctors), note: "Awaiting admin action" })}
      ${MetricCard({ icon: "icon-calendar", label: "Active bookings", value: String(activeBookings), note: "Not cancelled" })}
      ${MetricCard({ icon: "icon-report", label: "Payment pending", value: String(unpaidBookings), note: "Can be waived by admin" })}
    </section>
  `;

  if (data.section === "doctors") {
    return renderAdminDoctorsSection(data);
  }

  if (data.section === "appointments") {
    return renderAdminAppointmentsSection(data);
  }

  if (data.section === "payments") {
    return renderAdminPaymentsSection(data);
  }

  return renderAdminOverview(data, metrics);
}

function renderAdminOverview(data, metrics) {
  const pendingDoctors = data.doctors.filter((doctor) => !doctor.isApproved).slice(0, 4);
  const recentBookings = data.bookings.map(normalizeBooking).slice(0, 4);

  return `
    <div class="section-stack">
      ${metrics}
      <div class="dashboard-grid overview-grid">
        ${Panel({
          eyebrow: "Quick actions",
          title: "Operations",
          children: QuickActionGrid([
            { href: "/admin?section=doctors", icon: "icon-user", label: "Review doctors", note: "Approve or reject profiles" },
            { href: "/admin?section=appointments", icon: "icon-calendar", label: "Manage bookings", note: "Cancel when needed" },
            { href: "/admin?section=payments", icon: "icon-wallet", label: "Payment queue", note: "Review pending payments" }
          ])
        })}
        ${Panel({
          eyebrow: "Approvals",
          title: "Pending doctors",
          children: renderCompactDoctors(pendingDoctors)
        })}
        ${Panel({
          eyebrow: "Activity",
          title: "Recent bookings",
          children: renderCompactBookings(recentBookings)
        })}
        ${Panel({
          eyebrow: "Status",
          title: "Platform alerts",
          children: renderAdminAlerts(data)
        })}
      </div>
    </div>
  `;
}

function renderAdminDoctorsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Approval queue",
        title: "Doctor profiles",
        children: renderDoctorApprovalTable(data.doctors)
      })}
    </div>
  `;
}

function renderAdminAppointmentsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Booking control",
        title: "Appointments",
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

function renderAdminPaymentsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Payments",
        title: "Payment review",
        children: renderAdminPaymentTable(data.bookings)
      })}
    </div>
  `;
}

function renderCompactDoctors(doctors) {
  return CompactList({
    items: doctors,
    emptyText: "No doctor profiles are waiting for review.",
    renderItem: (doctor) => `
      <div>
        <strong>${escapeHtml(doctor.fullName || "Doctor")}</strong>
        <span>${escapeHtml(doctor.specialization || "Specialization pending")}</span>
      </div>
      ${StatusBadge(doctor.rejectionReason ? "rejected" : "pending")}
    `
  });
}

function renderCompactBookings(bookings) {
  return CompactList({
    items: bookings,
    emptyText: "No recent bookings.",
    renderItem: (booking) => `
      <div>
        <strong>${escapeHtml(booking.patientName)} with ${escapeHtml(booking.doctorName)}</strong>
        <span>${escapeHtml(booking.date)} &middot; ${escapeHtml(booking.time || "Slot pending")}</span>
      </div>
      <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
    `
  });
}

function renderAdminAlerts(data) {
  const pendingDoctors = data.doctors.filter((doctor) => !doctor.isApproved).length;
  const pendingPayments = data.bookings.filter((booking) => booking.paymentStatus === "pending").length;
  const alerts = [];

  if (pendingDoctors) {
    alerts.push(["Doctor reviews", `${pendingDoctors} profile${pendingDoctors === 1 ? "" : "s"} waiting.`]);
  }

  if (pendingPayments) {
    alerts.push(["Payment queue", `${pendingPayments} booking${pendingPayments === 1 ? "" : "s"} pending.`]);
  }

  return CompactList({
    items: alerts,
    emptyText: "No platform alerts.",
    renderItem: ([title, detail]) => `
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    `
  });
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

function renderAdminPaymentTable(bookings) {
  const rows = bookings.map(normalizeBooking);

  return DataTable({
    columns: [
      { label: "Patient", key: "patientName" },
      { label: "Doctor", key: "doctorName" },
      { label: "Date", key: "date", render: (row) => `${escapeHtml(row.date)} <span class="muted-cell">${escapeHtml(row.time)}</span>` },
      { label: "Appointment", key: "status", render: (row) => StatusBadge(row.status) },
      { label: "Payment", key: "paymentStatus", render: (row) => StatusBadge(row.paymentStatus) },
      {
        label: "Action",
        key: "id",
        render: (row) => `
          <button class="small-button" type="button" data-waive-booking="${escapeHtml(row.id)}" ${row.paymentStatus === "waived" ? "disabled" : ""}>
            ${row.paymentStatus === "waived" ? "Waived" : "Waive payment"}
          </button>
        `
      }
    ],
    rows,
    emptyText: "No payment records yet."
  });
}

function bindAdminActions(root, navigate, section) {
  root.querySelectorAll("[data-approve-doctor]").forEach((button) => {
    button.addEventListener("click", async () => {
      await runAdminAction(root, navigate, section, async () => {
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

      await runAdminAction(root, navigate, section, async () => {
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

      await runAdminAction(root, navigate, section, async () => {
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

      await runAdminAction(root, navigate, section, async () => {
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

      await runAdminAction(root, navigate, section, async () => {
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
      await runAdminAction(root, navigate, section, async () => {
        await apiFetch(`/api/admin/bookings/${button.dataset.waiveBooking}/waive-payment`, { method: "PATCH" });
        toast("Payment waived.");
      });
    });
  });
}

async function runAdminAction(root, navigate, section, action) {
  try {
    await action();
    loadAdminDashboard(root, navigate, section);
  } catch (error) {
    toast(error.message);
    if (error.status === 401 || error.status === 403) {
      navigate("/login");
    }
  }
}

function bindRetry(root, navigate, section) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadAdminDashboard(root, navigate, section);
  });
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }

  return String(value).replaceAll('"', '\\"');
}

function getAdminTitle(section) {
  return {
    doctors: "Doctor Approvals",
    appointments: "Appointments",
    payments: "Payments",
    overview: "Admin Overview"
  }[section] || "Admin Overview";
}

function getAdminSubtitle(section) {
  return {
    doctors: "Review provider profiles and control approval status.",
    appointments: "Monitor platform bookings and cancel when required.",
    payments: "Review payment status and waive fees when approved.",
    overview: "A focused view of approvals, bookings, payments, and alerts."
  }[section] || "A focused view of approvals, bookings, payments, and alerts.";
}
