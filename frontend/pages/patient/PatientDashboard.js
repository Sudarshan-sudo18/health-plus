import { AppLayout, getActiveSection } from "/components/layout.js";
import { bindProfilePhotoInputs, PatientProfileForm } from "/components/profile.js";
import {
  BookingTable,
  CompactList,
  DoctorAvailabilityCard,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  QuickActionGrid,
  escapeHtml,
  formatDateInputValue,
  normalizeBooking,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";

const PATIENT_SECTIONS = ["overview", "doctors", "appointments", "payments", "profile"];

export const PatientDashboard = {
  title: "Health Plus | Patient",
  render({ path, query }) {
    const section = getActiveSection(query, PATIENT_SECTIONS);

    return AppLayout({
      activePath: path,
      activeSection: section,
      title: getPatientTitle(section),
      subtitle: getPatientSubtitle(section),
      children: `<div id="patientContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate, query }, root) {
    loadPatientDashboard(root, navigate, getActiveSection(query, PATIENT_SECTIONS));
  }
};

async function loadPatientDashboard(root, navigate, section, selectedDate = getSelectedDate(root)) {
  const content = root.querySelector("#patientContent");
  content.innerHTML = LoadingState("Loading patient workspace...");

  try {
    const [doctorData, bookingData, profileData] = await Promise.all([
      apiFetch(`/api/doctors/public?date=${encodeURIComponent(selectedDate)}`),
      apiFetch("/api/bookings/my"),
      apiFetch("/api/profile/me")
    ]);

    content.innerHTML = renderPatientData({
      doctors: doctorData.doctors || [],
      bookings: bookingData.bookings || [],
      profileResult: profileData,
      selectedDate,
      section
    });
    bindPatientActions(root, navigate, section);
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

function renderPatientData(data) {
  const openSlotCount = data.doctors.reduce(
    (total, doctor) => total + (doctor.availabilityForDate?.availableSlots?.length || 0),
    0
  );
  const activeBookings = data.bookings.filter((booking) => ["pending", "confirmed"].includes(booking.status)).length;

  const metrics = `
    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Approved doctors", value: String(data.doctors.length), note: "Available providers" })}
      ${MetricCard({ icon: "icon-calendar", label: "Open slots", value: String(openSlotCount), note: "Selected date" })}
      ${MetricCard({ icon: "icon-video", label: "Active bookings", value: String(activeBookings), note: "Pending or confirmed" })}
      ${MetricCard({ icon: "icon-prescription", label: "Profile", value: data.profileResult?.isProfileComplete ? "Complete" : "Incomplete", note: "Care details" })}
    </section>
  `;

  if (data.section === "doctors") {
    return renderDoctorBookingSection(data);
  }

  if (data.section === "appointments") {
    return renderPatientAppointmentsSection(data);
  }

  if (data.section === "payments") {
    return renderPatientPaymentsSection(data);
  }

  if (data.section === "profile") {
    return renderPatientProfileSection(data);
  }

  return renderPatientOverview(data, metrics, openSlotCount);
}

function renderPatientOverview(data, metrics, openSlotCount) {
  const rows = data.bookings.map(normalizeBooking);
  const upcoming = rows.filter((booking) => ["pending", "confirmed"].includes(booking.status)).slice(0, 4);
  const recent = rows.slice(0, 4);

  return `
    <div class="section-stack">
      ${metrics}
      <div class="dashboard-grid overview-grid">
        ${Panel({
          eyebrow: "Quick actions",
          title: "Next steps",
          children: QuickActionGrid([
            { href: "/patient?section=doctors", icon: "icon-calendar", label: "Book appointment", note: "Find open slots" },
            { href: "/patient?section=appointments", icon: "icon-video", label: "View bookings", note: "Manage upcoming care" },
            { href: "/patient?section=profile", icon: "icon-shield", label: "Complete profile", note: "Keep care details ready" },
            { href: "/patient?section=payments", icon: "icon-wallet", label: "Payment status", note: "Review consultation status" }
          ])
        })}
        ${Panel({
          eyebrow: "Upcoming",
          title: "Appointments",
          children: renderCompactBookings(upcoming, "No upcoming appointments.")
        })}
        ${Panel({
          eyebrow: "Activity",
          title: "Recent bookings",
          children: renderCompactBookings(recent, "No booking activity yet.")
        })}
        ${Panel({
          eyebrow: "Profile",
          title: "Care readiness",
          children: `
            <div class="status-summary">
              <strong>${escapeHtml(data.profileResult?.isProfileComplete ? "Profile ready" : "Profile incomplete")}</strong>
              <span>${escapeHtml(data.profileResult?.isProfileComplete ? "Your care details are saved." : "Complete your profile before your next consultation.")}</span>
              <a class="small-button" href="/patient?section=profile" data-link>Open profile</a>
            </div>
          `
        })}
      </div>
    </div>
  `;
}

function renderPatientProfileSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Private profile",
        title: "Patient details",
        children: `
          ${renderProfileReadiness(data.profileResult)}
          ${PatientProfileForm(data.profileResult?.profile || {}, data.profileResult?.user || {})}
        `
      })}
    </div>
  `;
}

function renderProfileReadiness(profileResult) {
  return `
    <div class="profile-readiness ${profileResult?.isProfileComplete ? "complete" : "incomplete"}">
      <strong>${profileResult?.isProfileComplete ? "Profile complete" : "First login setup"}</strong>
      <span>${profileResult?.isProfileComplete ? "Your details can be updated anytime." : "Add your basic care details to support smoother consultations."}</span>
    </div>
  `;
}

function renderDoctorBookingSection(data) {
  return `
    <div class="section-stack">
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
            <span>Shared with the doctor when you confirm a slot.</span>
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
    </div>
  `;
}

function renderPatientAppointmentsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Booking history",
        title: "Appointments",
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

function renderPatientPaymentsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Payments",
        title: "Consultation payment status",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "patient"
        })
      })}
    </div>
  `;
}

function renderCompactBookings(bookings, emptyText) {
  return CompactList({
    items: bookings,
    emptyText,
    renderItem: (booking) => `
      <div>
        <strong>${escapeHtml(booking.doctorName)}</strong>
        <span>${escapeHtml(booking.date)} &middot; ${escapeHtml(booking.time || "Slot pending")}</span>
      </div>
      <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
    `
  });
}

function bindPatientActions(root, navigate, section) {
  bindProfilePhotoInputs(root);

  root.querySelector("#patientProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await apiFetch("/api/profile/me", {
        method: "PATCH",
        body: Object.fromEntries(form.entries())
      });
      toast("Profile saved.");
      loadPatientDashboard(root, navigate, "profile");
    } catch (error) {
      toast(error.message || "Profile could not be saved.");
      if (error.status === 401 || error.status === 403) {
        navigate("/login");
      }
    }
  });

  const bookingDate = root.querySelector("#bookingDate");
  bookingDate?.addEventListener("change", () => {
    loadPatientDashboard(root, navigate, "doctors", bookingDate.value || formatDateInputValue());
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
        loadPatientDashboard(root, navigate, "doctors", selectedDate);
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
        loadPatientDashboard(root, navigate, section, root.querySelector("#bookingDate")?.value || formatDateInputValue());
      } catch (error) {
        toast(error.message);
        if (error.status === 401 || error.status === 403) {
          navigate("/login");
        }
      }
    });
  });
}

function bindRetry(root, navigate, section) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadPatientDashboard(root, navigate, section);
  });
}

function getSelectedDate(root) {
  return root.querySelector("#bookingDate")?.value || formatDateInputValue();
}

function getPatientTitle(section) {
  return {
    doctors: "Find a Doctor",
    appointments: "Appointments",
    payments: "Payments",
    profile: "Patient Profile",
    overview: "Patient Overview"
  }[section] || "Patient Overview";
}

function getPatientSubtitle(section) {
  return {
    doctors: "Choose a date, select an available slot, and share consultation notes.",
    appointments: "Review and manage your Health Plus bookings.",
    payments: "Track payment status for your consultations.",
    profile: "Keep your private care details up to date.",
    overview: "A focused view of care activity, upcoming visits, and next actions."
  }[section] || "A focused view of care activity, upcoming visits, and next actions.";
}
