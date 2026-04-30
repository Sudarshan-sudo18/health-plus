import { AppLayout } from "/components/layout.js";
import { DataTable, LoadingState, MetricCard, Panel, StatusBadge, toast } from "/components/ui.js";
import { apiFetch } from "/services/api.js";

export const AdminDashboard = {
  title: "Health Plus | Admin",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Admin Dashboard",
      subtitle: "Manage users, appointments, reports, and operational controls from the protected admin API route.",
      children: `<div id="adminContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate }, root) {
    loadAdminDashboard(root, navigate);
  }
};

async function loadAdminDashboard(root, navigate) {
  try {
    const data = await apiFetch("/admin");
    root.querySelector("#adminContent").innerHTML = renderAdminData(data);
    bindAdminActions(root, navigate);
  } catch (error) {
    toast(error.message);
    navigate("/login");
  }
}

function renderAdminData(data) {
  return `
    <section class="metric-grid">
      ${MetricCard({ icon: "icon-user", label: "Users", value: String(data.users.length), note: "Across all roles" })}
      ${MetricCard({ icon: "icon-calendar", label: "Appointments", value: String(data.appointments.length), note: "Requested, confirmed, completed" })}
      ${MetricCard({ icon: "icon-shield", label: "Doctors", value: String(data.doctors.length), note: "Verified providers" })}
      ${MetricCard({ icon: "icon-report", label: "Reports", value: String(data.reports.length), note: "Operational snapshots" })}
    </section>

    <div class="dashboard-grid admin-dashboard-grid">
      ${Panel({
        eyebrow: "Manage users",
        title: "Users and roles",
        children: DataTable({
          columns: [
            { label: "Name", key: "name" },
            { label: "Email", key: "email" },
            { label: "Role", key: "role", render: (row) => `<strong>${row.role}</strong>` },
            { label: "Created", key: "createdAt", render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "New" }
          ],
          rows: data.users
        })
      })}

      ${Panel({
        eyebrow: "Manage appointments",
        title: "Appointment queue",
        children: DataTable({
          columns: [
            { label: "Patient", key: "patientName" },
            { label: "Doctor", key: "doctorName" },
            { label: "Date", key: "date" },
            { label: "Status", key: "status", render: (row) => StatusBadge(row.status) },
            {
              label: "Action",
              key: "id",
              render: (row) => `
                <div class="inline-actions">
                  <button class="small-button" type="button" data-admin-status="${row.id}:confirmed">Confirm</button>
                  <button class="small-button" type="button" data-admin-status="${row.id}:completed">Complete</button>
                </div>
              `
            }
          ],
          rows: data.appointments
        })
      })}

      ${Panel({
        eyebrow: "Reports",
        title: "Operational reports",
        children: `
          <div class="report-grid">
            ${data.reports
              .map(
                (report) => `
                  <article class="report-card">
                    <span>${report.label}</span>
                    <strong>${report.value}</strong>
                    <small>${report.trend}</small>
                  </article>
                `
              )
              .join("")}
          </div>
        `
      })}
    </div>
  `;
}

function bindAdminActions(root, navigate) {
  root.querySelectorAll("[data-admin-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [appointmentId, status] = button.dataset.adminStatus.split(":");
      try {
        await apiFetch(`/admin/appointments/${appointmentId}/status`, {
          method: "PATCH",
          body: { status }
        });
        toast("Appointment status updated.");
        loadAdminDashboard(root, navigate);
      } catch (error) {
        toast(error.message);
        navigate("/login");
      }
    });
  });
}
