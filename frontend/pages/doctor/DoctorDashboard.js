import { AppLayout } from "/components/layout.js";
import { DataTable, LoadingState, MetricCard, Panel, StatusBadge, toast } from "/components/ui.js";
import { apiFetch } from "/services/api.js";

export const DoctorDashboard = {
  title: "Health Plus | Doctor",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Doctor Dashboard",
      subtitle: "View appointments and patient records from the protected doctor API route.",
      children: `<div id="doctorContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate }, root) {
    loadDoctorDashboard(root, navigate);
  }
};

async function loadDoctorDashboard(root, navigate) {
  try {
    const data = await apiFetch("/doctor");
    root.querySelector("#doctorContent").innerHTML = renderDoctorData(data);
    bindDoctorActions(root, navigate);
  } catch (error) {
    toast(error.message);
    navigate("/login");
  }
}

function renderDoctorData(data) {
  const doctor = data.doctor;
  const patientIds = new Set(data.appointments.map((item) => item.patientId));

  return `
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
      ${MetricCard({ icon: "icon-calendar", label: "Assigned appointments", value: String(data.appointments.length), note: "Visible only to this doctor" })}
      ${MetricCard({ icon: "icon-user", label: "Patients", value: String(patientIds.size), note: "With active or past visits" })}
      ${MetricCard({ icon: "icon-prescription", label: "Records", value: String(data.patientRecords.length), note: "Prescriptions and diagnoses" })}
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
          rows: data.appointments,
          emptyText: "No appointments assigned to this doctor."
        })
      })}

      ${Panel({
        eyebrow: "Patient records",
        title: "Linked medical records",
        children: data.patientRecords.length
          ? `
            <div class="record-grid">
              ${data.patientRecords
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
  `;
}

function bindDoctorActions(root, navigate) {
  root.querySelectorAll("[data-doctor-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [appointmentId, status] = button.dataset.doctorStatus.split(":");
      try {
        await apiFetch(`/doctor/appointments/${appointmentId}/status`, {
          method: "PATCH",
          body: { status }
        });
        toast("Appointment updated.");
        loadDoctorDashboard(root, navigate);
      } catch (error) {
        toast(error.message);
        navigate("/login");
      }
    });
  });
}
