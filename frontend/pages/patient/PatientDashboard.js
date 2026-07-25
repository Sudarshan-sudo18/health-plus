import { AppLayout, getActiveSection } from "/components/layout.js";
import { BookingCalendar, normalizeCalendarMonth } from "/components/calendar/Calendar.js";
import { DoctorSelectionList, SlotPanel } from "/components/calendar/SlotPanel.js";
import { bindProfilePhotoInputs, PatientProfileForm } from "/components/profile.js";
import {
  BookingTable,
  CompactList,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  QuickActionGrid,
  escapeHtml,
  formatDateInputValue,
  isCancelledBooking,
  isPastVisitBooking,
  isUpcomingBooking,
  normalizeBooking,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";
import { fetchDoctorsForBooking, normalizeScheduleDate } from "/services/scheduling.js";

const PATIENT_SECTIONS = ["overview", "doctors", "appointments", "payments", "profile"];
const BOOKING_WINDOW_DAYS = 90;

export const PatientDashboard = {
  title: "Ārogyam | Patient Portal",
  render({ path, query, section: routeSection }) {
    const section = routeSection || getActiveSection(query, PATIENT_SECTIONS);

    return AppLayout({
      activePath: path,
      activeSection: section,
      title: getPatientTitle(section),
      subtitle: getPatientSubtitle(section),
      children: `<div id="patientContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate, query, section: routeSection }, root) {
    loadPatientDashboard(
      root,
      navigate,
      routeSection || getActiveSection(query, PATIENT_SECTIONS),
      normalizePatientBookingDate(query.get("date") || getSelectedDate(root)),
      query.get("doctor") || getSelectedDoctorId(root),
      normalizeCalendarMonth(query.get("month") || normalizePatientBookingDate(query.get("date") || getSelectedDate(root)))
    );
  }
};

async function loadPatientDashboard(
  root,
  navigate,
  section,
  selectedDate = getSelectedDate(root),
  selectedDoctorId = getSelectedDoctorId(root),
  calendarMonth = normalizeCalendarMonth(selectedDate)
) {
  const normalizedDate = normalizePatientBookingDate(selectedDate);
  const content = root.querySelector("#patientContent");
  content.innerHTML = LoadingState("Loading patient workspace...");

  try {
    const [doctorResult, bookingData, profileData] = await Promise.all([
      fetchDoctorsForBooking(normalizedDate, selectedDoctorId),
      apiFetch("/api/bookings/my"),
      apiFetch("/api/profile/me")
    ]);

    content.innerHTML = renderPatientData({
      doctors: doctorResult.doctors,
      selectedDoctorId: doctorResult.selectedDoctorId,
      selectedDoctor: doctorResult.selectedDoctor,
      bookings: bookingData.bookings || [],
      profileResult: profileData,
      selectedDate: normalizedDate,
      calendarMonth,
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
  const activeBookings = data.bookings.map(normalizeBooking).filter(isUpcomingBooking).length;

  const metrics = `
    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Approved doctors", value: String(data.doctors.length), note: "Available providers" })}
      ${MetricCard({ icon: "icon-calendar", label: "Open slots", value: String(openSlotCount), note: "Selected doctor/date" })}
      ${MetricCard({ icon: "icon-video", label: "Upcoming bookings", value: String(activeBookings), note: "Scheduled visits" })}
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
  const upcoming = rows.filter(isUpcomingBooking).slice(0, 4);
  const recent = rows.slice(0, 4);

  return `
    <div class="section-stack">
      ${metrics}
      <div class="dashboard-grid overview-grid">
        ${Panel({
          eyebrow: "Quick actions",
          title: "Next steps",
          children: QuickActionGrid([
            { href: "/patient/doctors", icon: "icon-calendar", label: "Book appointment", note: "Find open slots" },
            { href: "/patient/appointments", icon: "icon-video", label: "View bookings", note: "Manage upcoming care" },
            { href: "/patient/profile", icon: "icon-shield", label: "Complete profile", note: "Keep care details ready" },
            { href: "/patient/payments", icon: "icon-wallet", label: "Payment status", note: "Review consultation status" }
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
              <a class="small-button" href="/patient/profile" data-link>Open profile</a>
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
  const maxBookingDate = getMaxBookingDate();

  return `
    <div class="section-stack">
      <input id="bookingDate" type="hidden" value="${escapeHtml(data.selectedDate)}">
      <input id="selectedDoctorId" type="hidden" value="${escapeHtml(data.selectedDoctorId || "")}">
      <div class="booking-flow-grid">
        ${Panel({
          eyebrow: "Doctor",
          title: "Choose a doctor",
          children: DoctorSelectionList({
            doctors: data.doctors,
            selectedDoctorId: data.selectedDoctorId
          })
        })}
        ${Panel({
          eyebrow: "Calendar",
          title: "Select a date",
          children: BookingCalendar({
            selectedDate: data.selectedDate,
            displayMonth: data.calendarMonth,
            minDate: formatDateInputValue(),
            maxDate: maxBookingDate
          })
        })}
      </div>
      ${Panel({
        eyebrow: "Slots",
        title: "Confirm appointment time",
        children: `
          <label class="booking-note-field">
            Consultation notes
            <textarea id="bookingNotes" rows="3" maxlength="1000" placeholder="Briefly describe the concern for the doctor"></textarea>
            <span>Shared with the doctor when you confirm a slot.</span>
          </label>
          ${SlotPanel({ doctor: data.selectedDoctor, selectedDate: data.selectedDate })}
        `
      })}
    </div>
  `;
}

function renderPatientAppointmentsSection(data) {
  const upcomingBookings = data.bookings.filter(isUpcomingBooking);
  const pastVisits = data.bookings.filter(isPastVisitBooking);
  const cancelledBookings = data.bookings.filter(isCancelledBooking);

  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Upcoming",
        title: "Upcoming appointments",
        children: BookingTable({
          bookings: upcomingBookings,
          perspective: "patient",
          actions: (row) => `
            <button class="small-button danger-button" type="button" data-cancel-booking="${escapeHtml(row.id)}" ${!isUpcomingBooking(row) ? "disabled" : ""}>
              ${isUpcomingBooking(row) ? "Cancel" : row.status === "cancelled" ? "Cancelled" : "Closed"}
            </button>
          `
        })
      })}
      ${Panel({
        eyebrow: "Past visits",
        title: "Completed and expired",
        children: BookingTable({
          bookings: pastVisits,
          perspective: "patient"
        })
      })}
      ${Panel({
        eyebrow: "Cancelled",
        title: "Cancelled appointments",
        children: BookingTable({
          bookings: cancelledBookings,
          perspective: "patient"
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

  root.querySelectorAll("[data-select-doctor]").forEach((button) => {
    button.addEventListener("click", () => {
      navigate(getPatientBookingUrl({
        doctorId: button.dataset.selectDoctor,
        selectedDate: getSelectedDate(root),
        calendarMonth: getVisibleCalendarMonth(root)
      }));
    });
  });

  root.querySelectorAll("[data-calendar-month]").forEach((button) => {
    button.addEventListener("click", () => {
      navigate(getPatientBookingUrl({
        doctorId: getSelectedDoctorId(root),
        selectedDate: getSelectedDate(root),
        calendarMonth: button.dataset.calendarMonth
      }));
    });
  });

  root.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedDate = normalizeScheduleDate(button.dataset.calendarDate || formatDateInputValue());
      navigate(getPatientBookingUrl({
        doctorId: getSelectedDoctorId(root),
        selectedDate,
        calendarMonth: normalizeCalendarMonth(selectedDate)
      }));
    });
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
        bookButton.dataset.startDatetime = button.dataset.startDatetime || "";
        bookButton.dataset.endDatetime = button.dataset.endDatetime || "";
      }
    });
  });

  root.querySelectorAll("[data-create-booking]").forEach((button) => {
    button.addEventListener("click", async () => {
      const originalLabel = button.innerHTML;
      try {
        const selectedDate = normalizeScheduleDate(root.querySelector("#bookingDate")?.value || formatDateInputValue());
        const startDateTime = button.dataset.startDatetime;
        const endDateTime = button.dataset.endDatetime;

        if (!startDateTime || !endDateTime) {
          toast("Select an available appointment time.");
          return;
        }

        button.disabled = true;
        button.innerHTML = `<span class="spinner tiny-spinner" aria-hidden="true"></span> Booking...`;

        await apiFetch("/api/bookings", {
          method: "POST",
          body: {
            doctorId: button.dataset.createBooking,
            startDateTime,
            endDateTime,
            notes: root.querySelector("#bookingNotes")?.value || ""
          }
        });
        toast("Booking created.");
        loadPatientDashboard(root, navigate, "doctors", selectedDate, getSelectedDoctorId(root), getVisibleCalendarMonth(root));
      } catch (error) {
        button.disabled = false;
        button.innerHTML = originalLabel;
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
        loadPatientDashboard(root, navigate, section, getSelectedDate(root), getSelectedDoctorId(root), getVisibleCalendarMonth(root));
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
  return normalizePatientBookingDate(root.querySelector("#bookingDate")?.value || formatDateInputValue());
}

function getSelectedDoctorId(root) {
  return root.querySelector("#selectedDoctorId")?.value || "";
}

function getVisibleCalendarMonth(root) {
  return normalizeCalendarMonth(root.querySelector("[data-calendar-current-month]")?.dataset.calendarCurrentMonth || getSelectedDate(root));
}

function getPatientBookingUrl({ doctorId, selectedDate, calendarMonth }) {
  const params = new URLSearchParams({
    date: normalizePatientBookingDate(selectedDate),
    month: normalizeCalendarMonth(calendarMonth || selectedDate)
  });

  if (doctorId) {
    params.set("doctor", doctorId);
  }

  return `/patient/doctors?${params.toString()}`;
}

function normalizePatientBookingDate(date) {
  const normalized = normalizeScheduleDate(date);
  const maxDate = getMaxBookingDate();
  return normalized > maxDate ? maxDate : normalized;
}

function getMaxBookingDate() {
  return formatDateInputValue(addDays(new Date(), BOOKING_WINDOW_DAYS));
}

function addDays(date, days) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
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
    appointments: "Review and manage your Ārogyam bookings.",
    payments: "Track payment status for your consultations.",
    profile: "Keep your private care details up to date.",
    overview: "A focused view of care activity, upcoming visits, and next actions."
  }[section] || "A focused view of care activity, upcoming visits, and next actions.";
}
