import { AppLayout } from "/components/layout.js";
import {
  BookingTable,
  DoctorAvailabilityCard,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  escapeHtml,
  formatDateInputValue,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";

export const PatientDashboard = {
  title: "Health Plus | Patient",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Patient Dashboard",
      subtitle: "Book approved doctors and review appointments from the protected booking API.",
      children: `<div id="patientContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate }, root) {
    loadPatientDashboard(root, navigate);
  }
};

async function loadPatientDashboard(root, navigate, selectedDate = getSelectedDate(root)) {
  const content = root.querySelector("#patientContent");
  content.innerHTML = LoadingState("Loading doctors, slots, and your bookings...");

  try {
    const [doctorData, bookingData] = await Promise.all([
      apiFetch(`/api/doctors?date=${encodeURIComponent(selectedDate)}`),
      apiFetch("/api/bookings/my")
    ]);

    content.innerHTML = renderPatientData({
      doctors: doctorData.doctors || [],
      bookings: bookingData.bookings || [],
      selectedDate
    });
    bindPatientActions(root, navigate);
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

function renderPatientData(data) {
  const availableSlotCount = data.doctors.reduce(
    (total, doctor) => total + (doctor.availabilityForDate?.availableSlots?.length || 0),
    0
  );

  return `
    <section class="patient-hero">
      <div>
        <p class="eyebrow">Immediate care</p>
        <h2>Find a doctor for a short-notice consultation</h2>
        <p>Choose an approved doctor, select an available slot, and keep the booking tied to your account.</p>
      </div>
      <img src="/assets/hero-telemedicine.png" alt="Telemedicine consultation preview">
    </section>

    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Approved doctors", value: String(data.doctors.length), note: "Available through the live API" })}
      ${MetricCard({ icon: "icon-calendar", label: "Open slots", value: String(availableSlotCount), note: "For the selected date" })}
      ${MetricCard({ icon: "icon-video", label: "Bookings", value: String(data.bookings.length), note: "Linked to this patient account" })}
    </section>

    <div class="dashboard-grid patient-dashboard-grid">
      ${Panel({
        eyebrow: "Book appointments",
        title: "Approved doctors and availability",
        actions: `
          <label class="compact-field">
            Date
            <input id="bookingDate" type="date" value="${escapeHtml(data.selectedDate)}" min="${formatDateInputValue()}">
          </label>
        `,
        children: `
          <div class="doctor-grid compact-grid availability-grid">
            ${
              data.doctors.length
                ? data.doctors
                    .map((doctor) => DoctorAvailabilityCard({ doctor, selectedDate: data.selectedDate, mode: "patient" }))
                    .join("")
                : `<div class="empty-state">No approved doctors are available right now.</div>`
            }
          </div>
        `
      })}

      ${Panel({
        eyebrow: "Appointments",
        title: "Your bookings",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "patient"
        })
      })}
    </div>
  `;
}

function bindPatientActions(root, navigate) {
  const bookingDate = root.querySelector("#bookingDate");
  bookingDate?.addEventListener("change", () => {
    loadPatientDashboard(root, navigate, bookingDate.value || formatDateInputValue());
  });

  root.querySelectorAll("[data-select-slot]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest("[data-doctor-card]");
      const bookButton = card?.querySelector("[data-create-booking]");

      card?.querySelectorAll("[data-select-slot]").forEach((slotButton) => {
        slotButton.classList.remove("active");
        slotButton.setAttribute("aria-pressed", "false");
      });

      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");

      if (bookButton) {
        bookButton.disabled = false;
        bookButton.dataset.time = button.dataset.time;
      }
    });
  });

  root.querySelectorAll("[data-create-booking]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiFetch("/api/bookings", {
          method: "POST",
          body: {
            doctorId: button.dataset.createBooking,
            date: root.querySelector("#bookingDate")?.value || formatDateInputValue(),
            time: button.dataset.time
          }
        });
        toast("Booking created.");
        loadPatientDashboard(root, navigate, root.querySelector("#bookingDate")?.value || formatDateInputValue());
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
    loadPatientDashboard(root, navigate);
  });
}

function getSelectedDate(root) {
  return root.querySelector("#bookingDate")?.value || formatDateInputValue();
}
