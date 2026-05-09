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
      subtitle: "Find approved doctors, choose an available slot, and manage your booking history.",
      children: `<div id="patientContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate }, root) {
    loadPatientDashboard(root, navigate);
  }
};

async function loadPatientDashboard(root, navigate, selectedDate = getSelectedDate(root)) {
  const content = root.querySelector("#patientContent");
  content.innerHTML = LoadingState("Loading approved doctors and bookings...");

  try {
    const [doctorData, bookingData] = await Promise.all([
      apiFetch(`/api/doctors/public?date=${encodeURIComponent(selectedDate)}`),
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
  const openSlotCount = data.doctors.reduce(
    (total, doctor) => total + (doctor.availabilityForDate?.availableSlots?.length || 0),
    0
  );
  const activeBookings = data.bookings.filter((booking) => booking.status !== "cancelled").length;

  return `
    <section class="patient-hero">
      <div>
        <p class="eyebrow">Immediate care</p>
        <h2>Book trusted medical advice at short notice</h2>
        <p>Only approved and active doctors are shown here. Select a date, choose a live slot, and add a short note for the consultation.</p>
      </div>
      <img src="/assets/hero-telemedicine.png" alt="Telemedicine consultation preview">
    </section>

    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Approved doctors", value: String(data.doctors.length), note: "Visible to patients" })}
      ${MetricCard({ icon: "icon-calendar", label: "Open slots", value: String(openSlotCount), note: "For selected date" })}
      ${MetricCard({ icon: "icon-video", label: "Active bookings", value: String(activeBookings), note: "Pending or confirmed" })}
      ${MetricCard({ icon: "icon-prescription", label: "Total history", value: String(data.bookings.length), note: "Saved to your account" })}
    </section>

    <div class="dashboard-grid patient-dashboard-grid">
      ${Panel({
        eyebrow: "Book appointment",
        title: "Available doctors",
        actions: `
          <label class="compact-field">
            Date
            <input id="bookingDate" type="date" value="${escapeHtml(data.selectedDate)}" min="${formatDateInputValue()}">
          </label>
        `,
        children: `
          <label class="booking-note-field">
            Consultation notes
            <textarea id="bookingNotes" rows="3" maxlength="1000" placeholder="Briefly describe the concern for the doctor"></textarea>
          </label>
          <div class="doctor-grid compact-grid availability-grid">
            ${
              data.doctors.length
                ? data.doctors
                    .map((doctor) => DoctorAvailabilityCard({ doctor, selectedDate: data.selectedDate, mode: "patient" }))
                    .join("")
                : `<div class="empty-state">No approved doctors are available for patients right now.</div>`
            }
          </div>
        `
      })}

      ${Panel({
        eyebrow: "Booking history",
        title: "Your bookings",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "patient",
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

function bindPatientActions(root, navigate) {
  const bookingDate = root.querySelector("#bookingDate");
  bookingDate?.addEventListener("change", () => {
    loadPatientDashboard(root, navigate, bookingDate.value || formatDateInputValue());
  });

  root.querySelectorAll("[data-select-slot]").forEach((button) => {
    button.addEventListener("click", () => {
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
        bookButton.dataset.slot = button.dataset.time;
      }
    });
  });

  root.querySelectorAll("[data-create-booking]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const selectedDate = root.querySelector("#bookingDate")?.value || formatDateInputValue();
        await apiFetch("/api/bookings", {
          method: "POST",
          body: {
            doctorId: button.dataset.createBooking,
            bookingDate: selectedDate,
            slot: button.dataset.slot,
            notes: root.querySelector("#bookingNotes")?.value || ""
          }
        });
        toast("Booking created.");
        loadPatientDashboard(root, navigate, selectedDate);
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
        await apiFetch(`/api/bookings/${button.dataset.cancelBooking}`, {
          method: "DELETE",
          body: { reason: "Cancelled by patient" }
        });
        toast("Booking cancelled.");
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
