import { apiFetch } from "/services/api.js";
import { formatDateInputValue, getRecordId } from "/components/ui.js";

export async function fetchDoctorsWithSlots(date) {
  const selectedDate = normalizeScheduleDate(date);
  const doctorData = await apiFetch("/api/doctors/public");
  const doctors = doctorData.doctors || [];

  const hydratedDoctors = await Promise.all(
    doctors.map(async (doctor) => {
      const doctorId = getRecordId(doctor);

      if (!doctorId) {
        return doctor;
      }

      try {
        const slotData = await apiFetch(`/api/scheduling/doctor/${encodeURIComponent(doctorId)}/slots?date=${encodeURIComponent(selectedDate)}`);
        return {
          ...doctor,
          availabilityForDate: slotData.availability
        };
      } catch (error) {
        return {
          ...doctor,
          availabilityError: error.message || "Could not load slots for this date.",
          availabilityForDate: {
            date: selectedDate,
            day: "",
            slots: [],
            bookedSlots: [],
            availableSlots: [],
            slotDetails: []
          }
        };
      }
    })
  );

  return hydratedDoctors;
}

export function normalizeScheduleDate(date) {
  const normalized = formatDateInputValue(date || new Date());
  return normalized < formatDateInputValue() ? formatDateInputValue() : normalized;
}

export async function fetchAvailabilityRules() {
  const result = await apiFetch("/api/scheduling/rules");
  return result.rules || [];
}

export async function saveAvailabilityRules(rules) {
  return apiFetch("/api/scheduling/rules", {
    method: "PUT",
    body: { rules }
  });
}

export async function fetchAvailabilityBlocks() {
  const result = await apiFetch("/api/scheduling/exceptions");
  return result.exceptions || [];
}

export async function createAvailabilityBlock(block) {
  return apiFetch("/api/scheduling/exceptions", {
    method: "POST",
    body: block
  });
}

export async function deleteAvailabilityBlock(id) {
  return apiFetch(`/api/scheduling/exceptions/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}
