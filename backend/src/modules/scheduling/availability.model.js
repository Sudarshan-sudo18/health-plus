import mongoose from "mongoose";

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const doctorAvailabilityRuleSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
    index: true
  },
  weekday: {
    type: String,
    required: true,
    enum: WEEK_DAYS,
    index: true
  },
  startTime: {
    type: String,
    required: true,
    trim: true,
    match: [TIME_PATTERN, "Start time must use HH:mm 24-hour format."]
  },
  endTime: {
    type: String,
    required: true,
    trim: true,
    match: [TIME_PATTERN, "End time must use HH:mm 24-hour format."]
  },
  slotDuration: {
    type: Number,
    required: true,
    min: 5,
    max: 240
  },
  timezone: {
    type: String,
    required: true,
    trim: true,
    default: "UTC",
    validate: {
      validator(timezone) {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: timezone });
          return true;
        } catch {
          return false;
        }
      },
      message: "Timezone must be a valid IANA timezone."
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
});

doctorAvailabilityRuleSchema.index({ doctorId: 1, weekday: 1, isActive: 1 });

doctorAvailabilityRuleSchema.pre("validate", function validateTimeRange(next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    return next(new Error("Availability rule end time must be after start time."));
  }
  return next();
});

export const DoctorAvailabilityRule =
  mongoose.models.DoctorAvailabilityRule ||
  mongoose.model("DoctorAvailabilityRule", doctorAvailabilityRuleSchema);
