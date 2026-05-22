import mongoose from "mongoose";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const availabilityExceptionSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ["blocked", "available", "override"],
    required: true,
    default: "blocked"
  },
  startTime: {
    type: String,
    trim: true,
    match: [TIME_PATTERN, "Start time must use HH:mm 24-hour format."],
    default: ""
  },
  endTime: {
    type: String,
    trim: true,
    match: [TIME_PATTERN, "End time must use HH:mm 24-hour format."],
    default: ""
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 300,
    default: ""
  }
});

availabilityExceptionSchema.index({ doctorId: 1, date: 1, type: 1 });

availabilityExceptionSchema.pre("validate", function normalizeExceptionDate(next) {
  if (this.date) {
    this.date = new Date(Date.UTC(this.date.getUTCFullYear(), this.date.getUTCMonth(), this.date.getUTCDate()));
  }

  if ((this.startTime && !this.endTime) || (!this.startTime && this.endTime)) {
    return next(new Error("Availability exceptions require both start and end times."));
  }

  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    return next(new Error("Availability exception end time must be after start time."));
  }

  return next();
});

export const AvailabilityException =
  mongoose.models.AvailabilityException ||
  mongoose.model("AvailabilityException", availabilityExceptionSchema);
