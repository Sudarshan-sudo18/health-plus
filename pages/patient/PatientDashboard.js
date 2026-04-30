import { AppLayout } from "/components/layout.js";
import { DataTable, DoctorCard, MetricCard, Panel, StatusBadge, toast } from "/components/ui.js";
import { bookAppointment, getPatientAppointments, getPatientPrescriptions, getState } from "/data/store.js";

export const PatientDashboard = {
  title: "Health Plus | Patient",
  render({ session, path }) {
    const state = getState();
    const patientId = session.patientId;
    const appointments = getPatientAppointments(patientId);
    const prescriptions = getPatientPrescriptions(patientId);

    return AppLayout({
      activePath: path,
      title: "Patient Dashboard",
      subtitle: "Book appointments, track visits, and review prescriptions from your protected patient account.",
      children: `
        <section class="patient-hero">
          <div>
            <p class="eyebrow">Immediate care</p>
            <h2>Find a doctor for a short-notice consultation</h2>
            <p>Choose a verified doctor, share the concern, and keep the booking tied to your Health Plus account.</p>
          </div>
          <img src="/assets/hero-telemedicine.png" alt="Telemedicine consultation preview">
        </section>

        <section class="metric-grid">
          ${MetricCard({ icon: "icon-calendar", label: "Appointments", value: String(appointments.length), note: "Booked under this account" })}
          ${MetricCard({ icon: "icon-prescription", label: "Prescriptions", value: String(prescriptions.length), note: "Linked medical records" })}
          ${MetricCard({ icon: "icon-video", label: "Next visit", value: appointments[0] ? appointments[0].date : "None", note: appointments[0] ? appointments[0].status : "Book to begin" })}
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
                <input type="hidden" name="doctorId" id="selectedDoctorId" value="${state.doctors[0].id}">
              </form>
              <div class="doctor-grid compact-grid">
                ${state.doctors.map((doctor) => DoctorCard(doctor)).join("")}
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
              rows: appointments,
              emptyText: "No appointments yet. Book one from the doctor list."
            })
          })}

          ${Panel({
            eyebrow: "Prescriptions",
            title: "Medicines and diagnoses",
            children: prescriptions.length
              ? `
                <div class="record-grid">
                  ${prescriptions
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
      `
    });
  },
  afterRender({ session }, root) {
    root.querySelectorAll("[data-book-doctor]").forEach((button) => {
      button.addEventListener("click", () => {
        const form = root.querySelector("#bookingForm");
        const data = new FormData(form);
        bookAppointment({
          patientId: session.patientId,
          patientName: session.name,
          doctorId: button.dataset.bookDoctor,
          reason: data.get("reason"),
          language: data.get("language")
        });
        toast("Appointment requested.");
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
    });
  }
};
