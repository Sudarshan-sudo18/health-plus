import { AppLayout } from "/components/layout.js";
import {
  BookingTable,
  ErrorState,
  LoadingState,
  MetricCard,
  Panel,
  StatusBadge,
  escapeHtml,
  formatCurrency,
  toast
} from "/components/ui.js";
import { apiFetch } from "/services/api.js";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const DoctorDashboard = {
  title: "Health Plus | Doctor",
  render({ path }) {
    return AppLayout({
      activePath: path,
      title: "Doctor Dashboard",
      subtitle: "Complete onboarding, maintain availability, and manage patient booking status.",
      children: `<div id="doctorContent">${LoadingState()}</div>`
    });
  },
  afterRender({ navigate, session }, root) {
    loadDoctorDashboard(root, navigate, session);
  }
};

async function loadDoctorDashboard(root, navigate, session) {
  const content = root.querySelector("#doctorContent");
  content.innerHTML = LoadingState("Loading profile and bookings...");

  try {
    const [profileData, bookingData] = await Promise.all([
      apiFetch("/api/doctors/me"),
      apiFetch("/api/doctors/bookings")
    ]);

    content.innerHTML = renderDoctorData({
      profile: profileData.doctor,
      bookings: bookingData.bookings || [],
      user: session?.user
    });
    bindDoctorActions(root, navigate, session);
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      toast("Please log in again.");
      navigate("/login");
      return;
    }

    content.innerHTML = ErrorState(error.message);
    bindRetry(root, navigate, session);
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

  return `
    ${renderProfileStatus(profile)}

    <section class="metric-grid">
      ${MetricCard({ icon: "icon-shield", label: "Profile", value: profile ? profileStatusLabel(profile) : "Draft", note: profile ? formatCurrency(profile.consultationFee) : "Submit for approval" })}
      ${MetricCard({ icon: "icon-calendar", label: "Bookings", value: String(data.bookings.length), note: "Assigned to your doctor profile" })}
      ${MetricCard({ icon: "icon-user", label: "Patients", value: String(patientIds.size), note: "Unique booked patients" })}
      ${MetricCard({ icon: "icon-video", label: "Confirmed", value: String(confirmedBookings), note: `${pendingBookings} pending` })}
    </section>

    <div class="dashboard-grid doctor-dashboard-grid">
      ${Panel({
        eyebrow: "Onboarding",
        title: "Doctor profile",
        children: renderProfileForm(profile, data.user)
      })}

      ${Panel({
        eyebrow: "Weekly schedule",
        title: "Availability",
        children: renderAvailabilityForm(profile)
      })}

      ${Panel({
        eyebrow: "Patient bookings",
        title: "Consultations",
        children: BookingTable({
          bookings: data.bookings,
          perspective: "doctor",
          actions: renderDoctorBookingActions
        })
      })}
    </div>
  `;
}

function renderProfileStatus(profile) {
  if (!profile) {
    return `
      <section class="doctor-profile-band">
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
      <div>
        <p class="eyebrow">${escapeHtml(profile.specialization)}</p>
        <h2>${escapeHtml(profile.fullName)}</h2>
        <p>${escapeHtml(profile.qualification)} · ${escapeHtml(String(profile.yearsOfExperience))} years experience</p>
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
        Bio
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
      ${WEEK_DAYS.map((day) => {
        const slots = (profile?.availability || []).find((item) => item.day === day)?.slots || [];
        return `
          <label>
            ${day}
            <input data-availability-day="${day}" value="${escapeHtml(slots.join(", "))}">
          </label>
        `;
      }).join("")}
      <div class="form-actions">
        <button class="primary-button" type="submit">Save availability</button>
      </div>
    </form>
  `;
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

function bindDoctorActions(root, navigate, session) {
  root.querySelector("#doctorProfileForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      await apiFetch("/api/doctors/profile", {
        method: "POST",
        body: Object.fromEntries(form.entries())
      });
      toast("Profile saved for admin review.");
      loadDoctorDashboard(root, navigate, session);
    } catch (error) {
      toast(error.message);
      if (error.status === 401 || error.status === 403) {
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
          .split(",")
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
      loadDoctorDashboard(root, navigate, session);
    } catch (error) {
      toast(error.message);
      if (error.status === 401 || error.status === 403) {
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
        loadDoctorDashboard(root, navigate, session);
      } catch (error) {
        toast(error.message);
        if (error.status === 401 || error.status === 403) {
          navigate("/login");
        }
      }
    });
  });
}

function bindRetry(root, navigate, session) {
  root.querySelector("[data-retry-load]")?.addEventListener("click", () => {
    loadDoctorDashboard(root, navigate, session);
  });
}

function profileStatusLabel(profile) {
  if (!profile) return "Pending";
  if (profile.rejectionReason) return "Rejected";
  if (!profile.isActive) return "Inactive";
  if (profile.isApproved) return "Approved";
  return "Pending";
}
