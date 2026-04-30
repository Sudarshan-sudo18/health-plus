import { AppLayout } from "/components/layout.js";
import { DataTable, MetricCard, Panel, StatusBadge, toast } from "/components/ui.js";
import { getState, toggleUserStatus, updateAppointmentStatus } from "/data/store.js";

export const AdminDashboard = {
  title: "Health Plus | Admin",
  render({ path }) {
    const state = getState();
    const appointmentRows = state.appointments;
    const userRows = state.users;

    return AppLayout({
      activePath: path,
      title: "Admin Dashboard",
      subtitle: "Manage users, appointments, reports, and operational controls from one protected admin route.",
      children: `
        <section class="metric-grid">
          ${MetricCard({ icon: "icon-user", label: "Users", value: String(state.users.length), note: "Across all roles" })}
          ${MetricCard({ icon: "icon-calendar", label: "Appointments", value: String(state.appointments.length), note: "Requested, confirmed, completed" })}
          ${MetricCard({ icon: "icon-shield", label: "Doctors", value: String(state.doctors.length), note: "Verified providers" })}
          ${MetricCard({ icon: "icon-report", label: "Reports", value: String(state.reports.length), note: "Operational snapshots" })}
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
                { label: "Status", key: "status", render: (row) => StatusBadge(row.status) },
                {
                  label: "Action",
                  key: "id",
                  render: (row) => `<button class="small-button" type="button" data-toggle-user="${row.id}">${row.status === "active" ? "Suspend" : "Activate"}</button>`
                }
              ],
              rows: userRows
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
                      <button class="small-button" type="button" data-status="${row.id}:confirmed">Confirm</button>
                      <button class="small-button" type="button" data-status="${row.id}:completed">Complete</button>
                    </div>
                  `
                }
              ],
              rows: appointmentRows
            })
          })}

          ${Panel({
            eyebrow: "Reports",
            title: "Operational reports",
            children: `
              <div class="report-grid">
                ${state.reports
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
      `
    });
  },
  afterRender(_, root) {
    root.querySelectorAll("[data-toggle-user]").forEach((button) => {
      button.addEventListener("click", () => {
        toggleUserStatus(button.dataset.toggleUser);
        toast("User status updated.");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    });

    root.querySelectorAll("[data-status]").forEach((button) => {
      button.addEventListener("click", () => {
        const [appointmentId, status] = button.dataset.status.split(":");
        updateAppointmentStatus(appointmentId, status);
        toast("Appointment status updated.");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    });
  }
};
