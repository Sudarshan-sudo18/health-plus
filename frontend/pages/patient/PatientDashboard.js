import { AppLayout } from "/components/layout.js";
import { DataTable, DoctorCard, LoadingState, MetricCard, Panel, StatusBadge, toast } from "/components/ui.js";
import { apiFetch } from "/services/api.js";

export const PatientDashboard = {
  title: "Health Plus | Patient",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Patient Dashboard",
      subtitle: "Book appointments and review prescriptions from the protected patient API route.",
      children: `<div id="patientContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate }, root) {
    loadPatientDashboard(root, navigate);
  }
};

async function loadPatientDashboard(root, navigate) {
  try {
    const data = await apiFetch("/patient");
    root.querySelector("#patientContent").innerHTML = renderPatientData(data);
    bindPatientActions(root, navigate);
  } catch (error) {
    toast(error.message);
    navigate("/login");
  }
}

function renderPatientData(data) {
  return `
    <section class="patient-hero">
      <div>
        <p class="eyebrow">Immediate care</p>
        <h2>Find a doctor for a short-notice consultation</h2>
        <p>Choose a verified doctor, share the concern, and keep the booking tied to your JWT-authenticated account.</p>
      </div>
      <img src="/assets/hero-telemedicine.png" alt="Telemedicine consultation preview">
    </section>

    <section class="metric-grid">
      ${MetricCard({ icon: "icon-calendar", label: "Appointments", value: String(data.appointments.length), note: "Booked under this account" })}
      ${MetricCard({ icon: "icon-prescription", label: "Prescriptions", value: String(data.prescriptions.length), note: "Linked medical records" })}
      ${MetricCard({ icon: "icon-video", label: "Next visit", value: data.appointments[0] ? data.appointments[0].date : "None", note: data.appointments[0] ? data.appointments[0].status : "Book to begin" })}
    </section>

    <div class="dashboard-grid patient-dashboard-grid">
      ${Panel({
        eyebrow: "Book appointments",
        title: "Available doctors",
        children: `
          <form id="bookingForm" class="booking-form">
            <label>
              Consultation concern
              <input name="reason" required placeholder="Fever, rash, follow-up, second opinion">
            </label>
            <label>
              Preferred language
              <select name="language">
                <option>English</option>
                <option>Hindi</option>
                <option>Spanish</option>
                <option>Arabic</option>
                <option>French</option>
              </select>
            </label>
          </form>
          <div class="doctor-grid compact-grid">
            ${data.doctors.map((doctor) => DoctorCard(doctor)).join("")}
          </div>
        `
      })}

      ${Panel({
        eyebrow: "Appointments",
        title: "Your bookings",
        children: DataTable({
          columns: [
            { label: "Doctor", key: "doctorName" },
            { label: "Date", key: "date", render: (row) => `${row.date} ${row.time}` },
            { label: "Reason", key: "reason" },
            { label: "Status", key: "status", render: (row) => StatusBadge(row.status) }
          ],
          rows: data.appointments,
          emptyText: "No appointments yet. Book one from the doctor list."
        })
      })}

      ${Panel({
        eyebrow: "Prescriptions",
        title: "Medicines and diagnoses",
        children: data.prescriptions.length
          ? `
            <div class="record-grid">
              ${data.prescriptions
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
          : `<div class="empty-state">Prescriptions issued by doctors will appear here.</div>`
      })}
    </div>
  `;
}

function bindPatientActions(root, navigate) {
  root.querySelectorAll("[data-book-doctor]").forEach((button) => {
    button.addEventListener("click", async () => {
      const form = root.querySelector("#bookingForm");
      const data = new FormData(form);
      try {
        await apiFetch("/patient/appointments", {
          method: "POST",
          body: {
            doctorId: button.dataset.bookDoctor,
            reason: data.get("reason"),
            language: data.get("language")
          }
        });
        toast("Appointment requested.");
        loadPatientDashboard(root, navigate);
      } catch (error) {
        toast(error.message);
        if (error.status === 401 || error.status === 403) {
          navigate("/login");
        }
      }
    });
  });
}
