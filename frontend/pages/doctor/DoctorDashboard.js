import { AppLayout, getActiveSection } from "/components/layout.js";
import { bindProfilePhotoInputs, ProfilePhotoInput, renderAvatar } from "/components/profile.js";
import {
  BookingTable,
  CompactList,
  DataTable,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  QuickActionGrid,
  StatusBadge,
  escapeHtml,
  formatCurrency,
  normalizeBooking,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DOCTOR_SECTIONS = ["overview", "appointments", "patients", "profile", "availability", "payments"];

export const DoctorDashboard = {
  title: "Health Plus | Doctor",
  render({ path, query }) {
    const section = getActiveSection(query, DOCTOR_SECTIONS);

    return AppLayout({
      activePath: path,
      activeSection: section,
      title: getDoctorTitle(section),
      subtitle: getDoctorSubtitle(section),
      children: `<div id="doctorContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate, session, query }, root) {
    loadDoctorDashboard(root, navigate, session, getActiveSection(query, DOCTOR_SECTIONS));
  }
};

async function loadDoctorDashboard(root, navigate, session, section) {
  const content = root.querySelector("#doctorContent");
  content.innerHTML = LoadingState("Loading doctor workspace...");

  try {
    const [profileData, bookingData] = await Promise.all([
      apiFetch("/api/doctors/me"),
      apiFetch("/api/doctors/bookings")
    ]);

    content.innerHTML = renderDoctorData({
      profile: profileData.doctor,
      bookings: bookingData.bookings || [],
      user: session?.user,
      section
    });
    bindDoctorActions(root, navigate, session, section);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      toast("Please log in again.");
      navigate("/login");
      return;
    }

    content.innerHTML = ErrorState(error.message);
    bindRetry(root, navigate, session, section);
  }
}

function renderDoctorData(data) {
  const profile = data.profile;
  const pendingBookings = data.bookings.filter((booking) => booking.status === "pending").length;
  const confirmedBookings = data.bookings.filter((booking) => booking.status === "confirmed").length;
  const patientIds = new Set(
    data.bookings
      .map((booking) => (typeof booking.patientId === "object" && booking.patientId ? booking.patientId.id || booking.patientId._id : booking.patientId))
      .filter(Boolean)
  );

  const metrics = `
    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Profile", value: profile ? profileStatusLabel(profile) : "Draft", note: profile ? formatCurrency(profile.consultationFee) : "Submit for approval" })}
      ${MetricCard({ icon: "icon-calendar", label: "Bookings", value: String(data.bookings.length), note: "All consultations" })}
      ${MetricCard({ icon: "icon-user", label: "Patients", value: String(patientIds.size), note: "Unique patients" })}
      ${MetricCard({ icon: "icon-video", label: "Confirmed", value: String(confirmedBookings), note: `${pendingBookings} pending` })}
    </section>
  `;

  if (data.section === "appointments") {
    return renderDoctorAppointmentsSection(data);
  }

  if (data.section === "patients") {
    return renderDoctorPatientsSection(data);
  }

  if (data.section === "profile") {
    return renderDoctorProfileSection(data);
  }

  if (data.section === "availability") {
    return renderDoctorAvailabilitySection(data);
  }

  if (data.section === "payments") {
    return renderDoctorPaymentsSection(data);
  }

  return renderDoctorOverview(data, metrics);
}

function renderDoctorOverview(data, metrics) {
  const rows = data.bookings.map(normalizeBooking);
  const upcoming = rows.filter((booking) => ["pending", "confirmed"].includes(booking.status)).slice(0, 4);
  const recent = rows.slice(0, 4);

  return `
    <div class="section-stack">
      ${renderProfileStatus(data.profile)}
      ${metrics}
      <div class="dashboard-grid overview-grid">
        ${Panel({
          eyebrow: "Quick actions",
          title: "Workspace shortcuts",
          children: QuickActionGrid([
            { href: "/doctor?section=appointments", icon: "icon-calendar", label: "Appointments", note: "Confirm or complete visits" },
            { href: "/doctor?section=availability", icon: "icon-video", label: "Availability", note: "Update weekly slots" },
            { href: "/doctor?section=profile", icon: "icon-shield", label: "Profile", note: "Maintain onboarding details" }
          ])
        })}
        ${Panel({
          eyebrow: "Upcoming",
          title: "Consultations",
          children: renderCompactBookings(upcoming, "No upcoming consultations.")
        })}
        ${Panel({
          eyebrow: "Activity",
          title: "Recent bookings",
          children: renderCompactBookings(recent, "No booking activity yet.")
        })}
        ${Panel({
          eyebrow: "Status",
          title: "Attention",
          children: renderDoctorAlerts(data.profile, data.bookings)
        })}
      </div>
    </div>
  `;
}

function renderDoctorAppointmentsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Patient bookings",
        title: "Appointments",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "doctor",
          actions: renderDoctorBookingActions
        })
      })}
    </div>
  `;
}

function renderDoctorPatientsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Patient records",
        title: "Booked patients",
        children: renderPatientTable(data.bookings)
      })}
    </div>
  `;
}

function renderDoctorProfileSection(data) {
  return `
    <div class="section-stack">
      ${renderProfileStatus(data.profile)}
      ${Panel({
        eyebrow: "Onboarding",
        title: "Doctor profile",
        children: renderProfileForm(data.profile, data.user)
      })}
    </div>
  `;
}

function renderDoctorAvailabilitySection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Weekly schedule",
        title: "Availability",
        children: renderAvailabilityForm(data.profile)
      })}
    </div>
  `;
}

function renderDoctorPaymentsSection(data) {
  return `
    <div class="section-stack">
      ${Panel({
        eyebrow: "Payments",
        title: "Consultation payment status",
        children: renderPaymentTable(data.bookings)
      })}
    </div>
  `;
}

function renderProfileStatus(profile) {
  if (!profile) {
    return `
      <section class="doctor-profile-band">
        <div class="profile-band-avatar"><span>DR</span></div>
        <div>
          <p class="eyebrow">Onboarding required</p>
          <h2>Create your doctor profile</h2>
          <p>Your profile must be approved by an admin before patients can book you.</p>
        </div>
        <div class="profile-summary">${StatusBadge("pending")}</div>
      </section>
    `;
  }

  const status = profileStatusLabel(profile).toLowerCase();

  return `
    <section class="doctor-profile-band">
      <div class="profile-band-avatar">${renderAvatar(profile.profilePicture || "", profile.fullName || "DR")}</div>
      <div>
        <p class="eyebrow">${escapeHtml(profile.specialization)}</p>
        <h2>${escapeHtml(profile.fullName)}</h2>
        <p>${escapeHtml(profile.qualification)} &middot; ${escapeHtml(String(profile.yearsOfExperience))} years experience</p>
      </div>
      <div class="profile-summary">
        ${StatusBadge(status)}
        ${profile.rejectionReason ? `<span>${escapeHtml(profile.rejectionReason)}</span>` : `<span>${escapeHtml(profile.clinicName)}</span>`}
      </div>
    </section>
  `;
}

function renderProfileForm(profile, user) {
  const languages = (profile?.languagesSpoken || []).join(", ");

  return `
    <form id="doctorProfileForm" class="profile-form">
      ${ProfilePhotoInput({ value: profile?.profilePicture || "", helper: "Shown on patient doctor cards after approval." })}
      <label>
        Full name
        <input name="fullName" required minlength="2" value="${escapeHtml(profile?.fullName || user?.name || "")}">
      </label>
      <label>
        Account email
        <input name="email" required readonly value="${escapeHtml(profile?.email || user?.email || "")}">
      </label>
      <label>
        Specialization
        <input name="specialization" required minlength="2" value="${escapeHtml(profile?.specialization || "")}">
      </label>
      <label>
        Qualification
        <input name="qualification" required minlength="2" value="${escapeHtml(profile?.qualification || "")}">
      </label>
      <label>
        Years of experience
        <input name="yearsOfExperience" type="number" min="0" max="80" required value="${escapeHtml(profile?.yearsOfExperience ?? "")}">
      </label>
      <label>
        Consultation fee
        <input name="consultationFee" type="number" min="0" step="0.01" required value="${escapeHtml(profile?.consultationFee ?? "")}">
      </label>
      <label>
        Consultation mode
        <select name="consultationMode" required>
          ${["online", "offline", "both"].map((mode) => `<option value="${mode}" ${profile?.consultationMode === mode ? "selected" : ""}>${escapeHtml(formatConsultationMode(mode))}</option>`).join("")}
        </select>
      </label>
      <label>
        Consultation duration
        <input name="consultationDuration" type="number" min="5" max="240" required value="${escapeHtml(profile?.consultationDuration ?? 30)}">
      </label>
      <label class="profile-form-wide">
        Hospital affiliation
        <input name="hospitalAffiliation" value="${escapeHtml(profile?.hospitalAffiliation || "")}">
      </label>
      <label>
        Clinic name
        <input name="clinicName" required minlength="2" value="${escapeHtml(profile?.clinicName || "")}">
      </label>
      <label>
        Clinic address
        <input name="clinicAddress" required minlength="5" value="${escapeHtml(profile?.clinicAddress || "")}">
      </label>
      <label class="profile-form-wide">
        Languages spoken
        <input name="languagesSpoken" required value="${escapeHtml(languages)}">
      </label>
      <label class="profile-form-wide">
        About
        <textarea name="bio" rows="5" minlength="20" maxlength="1200" required>${escapeHtml(profile?.bio || "")}</textarea>
      </label>
      <div class="form-actions profile-form-wide">
        <button class="primary-button" type="submit">Save profile</button>
      </div>
    </form>
  `;
}

function renderAvailabilityForm(profile) {
  return `
    <form id="availabilityForm" class="availability-editor">
      <p class="form-helper">Use 24-hour times separated by commas, semicolons, or new lines.</p>
      ${WEEK_DAYS.map((day) => {
        const slots = (profile?.availability || []).find((item) => item.day === day)?.slots || [];
        return `
          <label>
            ${day}
            <input data-availability-day="${day}" value="${escapeHtml(slots.join(", "))}" placeholder="09:00, 09:30, 10:00">
          </label>
        `;
      }).join("")}
      <div class="form-actions">
        <button class="primary-button" type="submit">Save availability</button>
      </div>
    </form>
  `;
}

function renderCompactBookings(bookings, emptyText) {
  return CompactList({
    items: bookings,
    emptyText,
    renderItem: (booking) => `
      <div>
        <strong>${escapeHtml(booking.patientName)}</strong>
        <span>${escapeHtml(booking.date)} &middot; ${escapeHtml(booking.time || "Slot pending")}</span>
      </div>
      <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
    `
  });
}

function renderDoctorAlerts(profile, bookings) {
  const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
  const alerts = [];

  if (!profile) {
    alerts.push(["Profile draft", "Complete your profile before patients can book."]);
  } else if (profile.rejectionReason) {
    alerts.push(["Profile rejected", profile.rejectionReason]);
  } else if (!profile.isApproved) {
    alerts.push(["Approval pending", "Your profile is waiting for admin review."]);
  } else if (profile.isActive === false) {
    alerts.push(["Profile inactive", "Patients cannot book inactive profiles."]);
  }

  if (pendingBookings) {
    alerts.push(["Pending appointments", `${pendingBookings} booking${pendingBookings === 1 ? "" : "s"} need a response.`]);
  }

  return CompactList({
    items: alerts,
    emptyText: "No items need attention.",
    renderItem: ([title, detail]) => `
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    `
  });
}

function renderPatientTable(bookings) {
  const patients = Array.from(
    bookings.reduce((map, booking) => {
      const patient = typeof booking.patientId === "object" && booking.patientId ? booking.patientId : null;
      const key = patient?.id || patient?._id || normalizeBooking(booking).patientName;
      const row = map.get(key) || {
        name: patient?.name || "Patient",
        email: patient?.email || "",
        total: 0,
        latest: "",
        status: "pending"
      };
      const normalized = normalizeBooking(booking);
      row.total += 1;
      row.latest = normalized.date;
      row.status = normalized.status;
      map.set(key, row);
      return map;
    }, new Map()).values()
  );

  return DataTable({
    columns: [
      {
        label: "Patient",
        key: "name",
        render: (row) => `
          <strong>${escapeHtml(row.name)}</strong>
          ${row.email ? `<span class="muted-cell">${escapeHtml(row.email)}</span>` : ""}
        `
      },
      { label: "Bookings", key: "total" },
      { label: "Latest visit", key: "latest" },
      { label: "Status", key: "status", render: (row) => StatusBadge(row.status) }
    ],
    rows: patients,
    emptyText: "No patient bookings yet."
  });
}

function renderPaymentTable(bookings) {
  const rows = bookings.map(normalizeBooking);

  return DataTable({
    columns: [
      { label: "Patient", key: "patientName" },
      { label: "Date", key: "date", render: (row) => `${escapeHtml(row.date)} <span class="muted-cell">${escapeHtml(row.time)}</span>` },
      { label: "Appointment", key: "status", render: (row) => StatusBadge(row.status) },
      { label: "Payment", key: "paymentStatus", render: (row) => StatusBadge(row.paymentStatus) }
    ],
    rows,
    emptyText: "No payment records yet."
  });
}

function renderDoctorBookingActions(row) {
  return `
    <div class="inline-actions">
      <button class="small-button" type="button" data-booking-status="${escapeHtml(row.id)}:confirmed" ${row.status !== "pending" ? "disabled" : ""}>Confirm</button>
      <button class="small-button" type="button" data-booking-status="${escapeHtml(row.id)}:completed" ${row.status !== "confirmed" ? "disabled" : ""}>Complete</button>
      <button class="small-button danger-button" type="button" data-booking-status="${escapeHtml(row.id)}:cancelled" ${row.status === "cancelled" ? "disabled" : ""}>Cancel</button>
    </div>
  `;
}

function bindDoctorActions(root, navigate, session, section) {
  bindProfilePhotoInputs(root);

  root.querySelector("#doctorProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await apiFetch("/api/doctors/profile", {
        method: "POST",
        body: Object.fromEntries(form.entries())
      });
      toast("Profile saved for admin review.");
      loadDoctorDashboard(root, navigate, session, section);
    } catch (error) {
      toast(error.message);
      if (error.status === 401) {
        navigate("/login");
      }
    }
  });

  root.querySelector("#availabilityForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const availability = Array.from(root.querySelectorAll("[data-availability-day]"))
      .map((input) => ({
        day: input.dataset.availabilityDay,
        slots: input.value
          .split(/[,\n;]+/)
          .map((slot) => slot.trim())
          .filter(Boolean)
      }))
      .filter((item) => item.slots.length > 0);

    try {
      await apiFetch("/api/doctors/availability", {
        method: "PATCH",
        body: { availability }
      });
      toast("Availability updated.");
      loadDoctorDashboard(root, navigate, session, section);
    } catch (error) {
      toast(error.message);
      if (error.status === 401) {
        navigate("/login");
      }
    }
  });

  root.querySelectorAll("[data-booking-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [bookingId, status] = button.dataset.bookingStatus.split(":");

      try {
        await apiFetch(`/api/bookings/${bookingId}/status`, {
          method: "PATCH",
          body: {
            status,
            reason: status === "cancelled" ? "Cancelled by doctor" : ""
          }
        });
        toast("Booking updated.");
        loadDoctorDashboard(root, navigate, session, section);
      } catch (error) {
        toast(error.message);
        if (error.status === 401 || error.status === 403) {
          navigate("/login");
        }
      }
    });
  });
}

function bindRetry(root, navigate, session, section) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadDoctorDashboard(root, navigate, session, section);
  });
}

function profileStatusLabel(profile) {
  if (!profile) return "Pending";
  if (profile.rejectionReason) return "Rejected";
  if (!profile.isActive) return "Inactive";
  if (profile.isApproved) return "Approved";
  return "Pending";
}

function getDoctorTitle(section) {
  return {
    appointments: "Appointments",
    patients: "Patients",
    profile: "Doctor Profile",
    availability: "Availability",
    payments: "Payments",
    overview: "Doctor Overview"
  }[section] || "Doctor Overview";
}

function getDoctorSubtitle(section) {
  return {
    appointments: "Review booking requests and update consultation status.",
    patients: "See patients connected to your bookings.",
    profile: "Maintain your onboarding profile and approval details.",
    availability: "Set weekly slots patients can book.",
    payments: "Review payment status for consultations.",
    overview: "A focused view of profile status, upcoming consultations, and next actions."
  }[section] || "A focused view of profile status, upcoming consultations, and next actions.";
}

function formatConsultationMode(mode) {
  return {
    online: "Online",
    offline: "Offline",
    both: "Online and offline"
  }[mode] || "Online";
}
