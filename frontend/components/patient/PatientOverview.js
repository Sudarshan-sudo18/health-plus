import {
  CompactList,
  DoctorAvatar,
  EmptyState,
  escapeHtml,
  formatCurrency,
  getRecordId,
  isUpcomingBooking,
  normalizeBooking
} from "/components/ui.js";

export function PatientOverview({ bookings = [], doctors = [], profileResult, selectedDate }) {
  const rows = bookings.map(normalizeBooking);
  const upcoming = rows.filter(isUpcomingBooking).sort(sortByStartTime)[0] || null;
  const recent = rows.slice(0, 3);
  const profileComplete = profileResult?.isProfileComplete === true;
  const userName = profileResult?.user?.name || "there";

  return `
    <div class="patient-overview">
      <section class="patient-welcome-card">
        <div class="patient-welcome-copy">
          <p class="eyebrow">Your care, in one place</p>
          <h2>Welcome back, ${escapeHtml(firstName(userName))}</h2>
          <p>Find the right doctor, choose a convenient time, and keep your care organised.</p>
          <a class="primary-button patient-primary-action" href="/patient/doctors" data-link>
            <svg aria-hidden="true"><use href="#icon-calendar"></use></svg>
            Book appointment
          </a>
        </div>
        <div class="patient-profile-prompt ${profileComplete ? "complete" : "incomplete"}">
          <span class="patient-profile-icon" aria-hidden="true"><svg><use href="#icon-shield"></use></svg></span>
          <div>
            <strong>${profileComplete ? "Care profile ready" : "Complete your care profile"}</strong>
            <span>${profileComplete ? "Your details are ready for your next consultation." : "Add essential details before your next consultation."}</span>
          </div>
          <a href="/patient/profile" data-link>${profileComplete ? "Review" : "Complete"}</a>
        </div>
      </section>

      <section class="patient-overview-section patient-upcoming-section" aria-labelledby="upcoming-care-title">
        <div class="patient-section-heading">
          <div>
            <p class="eyebrow">Next step</p>
            <h2 id="upcoming-care-title">Upcoming appointment</h2>
          </div>
          ${upcoming ? `<a class="text-link" href="/patient/appointments" data-link>View all</a>` : ""}
        </div>
        ${renderUpcomingAppointment(upcoming)}
      </section>

      <section class="patient-overview-section patient-recommendations-section" aria-labelledby="recommended-doctors-title">
        <div class="patient-section-heading">
          <div>
            <p class="eyebrow">Care team</p>
            <h2 id="recommended-doctors-title">Recommended doctors</h2>
          </div>
          <a class="text-link" href="/patient/doctors" data-link>Browse doctors</a>
        </div>
        ${renderDoctorRecommendations(doctors, selectedDate)}
      </section>

      <section class="patient-overview-section patient-activity-section" aria-labelledby="recent-activity-title">
        <div class="patient-section-heading">
          <div>
            <p class="eyebrow">Care history</p>
            <h2 id="recent-activity-title">Recent activity</h2>
          </div>
          ${recent.length ? `<a class="text-link" href="/patient/appointments" data-link>Appointments</a>` : ""}
        </div>
        ${renderRecentActivity(recent)}
      </section>
    </div>
  `;
}

function renderUpcomingAppointment(booking) {
  if (!booking) {
    return EmptyState({
      icon: "icon-calendar",
      title: "You're all set.",
      message: "Book your first consultation to get started.",
      actionLabel: "Book now",
      actionHref: "/patient/doctors",
      className: "patient-empty-card"
    });
  }

  return `
    <article class="patient-upcoming-card">
      <span class="patient-appointment-icon" aria-hidden="true"><svg><use href="#icon-video"></use></svg></span>
      <div class="patient-upcoming-copy">
        <span>${escapeHtml(booking.date)}</span>
        <h3>${escapeHtml(booking.doctorName || "Your doctor")}</h3>
        <p>${escapeHtml(booking.time || "Appointment time pending")} &middot; ${escapeHtml(booking.consultationMode || "Online consultation")}</p>
      </div>
      <a class="small-button" href="/patient/appointments" data-link>View details</a>
    </article>
  `;
}

function renderDoctorRecommendations(doctors, selectedDate) {
  const recommendedDoctors = doctors.slice(0, 3);

  if (!recommendedDoctors.length) {
    return EmptyState({
      icon: "icon-user",
      title: "Doctors will appear here soon.",
      message: "We are preparing available care providers for you.",
      className: "patient-empty-card"
    });
  }

  return `
    <div class="patient-doctor-rail">
      ${recommendedDoctors.map((doctor) => renderDoctorRecommendation(doctor, selectedDate)).join("")}
    </div>
  `;
}

function renderDoctorRecommendation(doctor, selectedDate) {
  const doctorId = getRecordId(doctor);
  const name = doctor.fullName || doctor.name || "Doctor";
  const specialty = doctor.specialization || doctor.specialty || "General medicine";
  const years = Number(doctor.yearsOfExperience || 0);
  const availability = doctor.availabilityForDate?.availableSlots?.length || 0;
  const bookingUrl = doctorId
    ? `/patient/doctors?${new URLSearchParams({ doctor: doctorId, date: selectedDate, month: selectedDate }).toString()}`
    : "/patient/doctors";

  return `
    <article class="patient-doctor-card">
      <div class="patient-doctor-card-head">
        ${DoctorAvatar(doctor.profilePicture, name)}
        <div>
          <span>${escapeHtml(specialty)}</span>
          <h3>${escapeHtml(name)}</h3>
        </div>
      </div>
      <div class="patient-doctor-meta">
        <span>${escapeHtml(years ? `${years} years experience` : "Experienced provider")}</span>
        <strong>${escapeHtml(formatCurrency(doctor.consultationFee || 0))}</strong>
      </div>
      <div class="patient-doctor-card-foot">
        <span class="patient-availability ${availability ? "available" : ""}">${availability ? `${availability} open slot${availability === 1 ? "" : "s"} today` : "View availability"}</span>
        <a href="${escapeHtml(bookingUrl)}" data-link>Choose</a>
      </div>
    </article>
  `;
}

function renderRecentActivity(bookings) {
  return CompactList({
    items: bookings,
    emptyText: "No appointments yet. Your care updates will appear here.",
    renderItem: (booking) => `
      <div>
        <strong>${escapeHtml(booking.doctorName || "Appointment")}</strong>
        <span>${escapeHtml(booking.date)} &middot; ${escapeHtml(booking.time || "Time pending")}</span>
      </div>
      <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
    `
  });
}

function firstName(value) {
  return String(value || "there").trim().split(/\s+/)[0] || "there";
}

function sortByStartTime(left, right) {
  return new Date(left.startDateTime || left.bookingDate || 0) - new Date(right.startDateTime || right.bookingDate || 0);
}
