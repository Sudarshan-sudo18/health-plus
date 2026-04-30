import { AppLayout } from "/components/layout.js";
import { DataTable, MetricCard, Panel, StatusBadge, toast } from "/components/ui.js";
import { getDoctorAppointments, getState, updateAppointmentStatus } from "/data/store.js";

export const DoctorDashboard = {
  title: "Health Plus | Doctor",
  render({ session, path }) {
    const state = getState();
    const doctorId = session.doctorId;
    const doctor = state.doctors.find((item) => item.id === doctorId) || state.doctors[0];
    const appointments = getDoctorAppointments(doctor.id);
    const patientIds = new Set(appointments.map((item) => item.patientId));
    const patientRecords = state.prescriptions.filter((item) => patientIds.has(item.patientId));

    return AppLayout({
      activePath: path,
      title: "Doctor Dashboard",
      subtitle: `Welcome ${doctor.name}. View appointments, patient records, and consultation context for your protected doctor account.`,
      children: `
        <section class="doctor-profile-band">
          <div class="doctor-photo large-avatar" style="--avatar-x:${doctor.avatar % 2 === 0 ? "0%" : "100%"};--avatar-y:${doctor.avatar < 2 ? "0%" : "100%"};"></div>
          <div>
            <p class="eyebrow">${doctor.specialty}</p>
            <h2>${doctor.name}</h2>
            <p>${doctor.license}</p>
            <div class="chip-row">${doctor.languages.map((item) => `<span>${item}</span>`).join("")}</div>
          </div>
        </section>

        <section class="metric-grid">
          ${MetricCard({ icon: "icon-calendar", label: "Assigned appointments", value: String(appointments.length), note: "Visible only to this doctor" })}
          ${MetricCard({ icon: "icon-user", label: "Patients", value: String(patientIds.size), note: "With active or past visits" })}
          ${MetricCard({ icon: "icon-prescription", label: "Records", value: String(patientRecords.length), note: "Prescriptions and diagnoses" })}
        </section>

        <div class="dashboard-grid">
          ${Panel({
            eyebrow: "Appointments",
            title: "Upcoming and recent consultations",
            children: DataTable({
              columns: [
                { label: "Patient", key: "patientName" },
                { label: "Date", key: "date", render: (row) => `${row.date} ${row.time}` },
                { label: "Reason", key: "reason" },
                { label: "Language", key: "language" },
                { label: "Status", key: "status", render: (row) => StatusBadge(row.status) },
                {
                  label: "Action",
                  key: "id",
                  render: (row) => `
                    <div class="inline-actions">
                      <button class="small-button" type="button" data-doctor-status="${row.id}:confirmed">Accept</button>
                      <button class="small-button" type="button" data-doctor-status="${row.id}:completed">Complete</button>
                    </div>
                  `
                }
              ],
              rows: appointments,
              emptyText: "No appointments assigned to this doctor."
            })
          })}

          ${Panel({
            eyebrow: "Patient records",
            title: "Linked medical records",
            children: patientRecords.length
              ? `
                <div class="record-grid">
                  ${patientRecords
                    .map(
                      (record) => `
                        <article class="record-card">
                          <span>${record.issuedOn}</span>
                          <h3>${record.diagnosis}</h3>
                          <p>${record.medicines}</p>
                          <small>${record.notes}</small>
                        </article>
                      `
                    )
                    .join("")}
                </div>
              `
              : `<div class="empty-state">No patient records are linked to your appointments yet.</div>`
          })}
        </div>
      `
    });
  },
  afterRender(_, root) {
    root.querySelectorAll("[data-doctor-status]").forEach((button) => {
      button.addEventListener("click", () => {
        const [appointmentId, status] = button.dataset.doctorStatus.split(":");
        updateAppointmentStatus(appointmentId, status);
        toast("Appointment updated.");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    });
  }
};
