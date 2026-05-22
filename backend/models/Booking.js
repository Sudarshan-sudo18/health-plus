import mongoose from "mongoose";

const ACTIVE_BOOKING_STATUSES = ["upcoming", "pending", "confirmed"];
const SLOT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const bookingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
    index: true
  },
  bookingDate: {
    type: Date,
    required: true,
    index: true
  },
  slot: {
    type: String,
    required: true,
    trim: true,
    match: [SLOT_PATTERN, "Slot must use HH:mm 24-hour format."]
  },
  startDateTime: {
    type: Date,
    index: true
  },
  endDateTime: {
    type: Date,
    index: true
  },
  status: {
    type: String,
    enum: ["upcoming", "pending", "confirmed", "completed", "cancelled"],
    default: "upcoming",
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "waived", "paid"],
    default: "pending"
  },
  notes: {
    type: String,
    trim: true,
    default: "",
    maxlength: 1000
  },
  cancelledBy: {
    type: String,
    enum: ["patient", "doctor", "admin", ""],
    default: ""
  },
  cancellationReason: {
    type: String,
    trim: true,
    default: "",
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

bookingSchema.index(
  { doctorId: 1, bookingDate: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ACTIVE_BOOKING_STATUSES }
    }
  }
);

bookingSchema.index(
  { doctorId: 1, startDateTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startDateTime: { $exists: true }
    }
  }
);

bookingSchema.index({ doctorId: 1, startDateTime: 1, endDateTime: 1, status: 1 });

bookingSchema.pre("validate", function normalizeBookingRange(next) {
  if (this.bookingDate) {
    const bookingDate = new Date(this.bookingDate);
    if (!Number.isNaN(bookingDate.getTime())) {
      this.bookingDate = new Date(Date.UTC(bookingDate.getUTCFullYear(), bookingDate.getUTCMonth(), bookingDate.getUTCDate()));
    }
  }

  if (!this.startDateTime && this.bookingDate && !Number.isNaN(new Date(this.bookingDate).getTime()) && this.slot) {
    const dateKey = this.bookingDate.toISOString().slice(0, 10);
    this.startDateTime = new Date(`${dateKey}T${this.slot}:00.000Z`);
  }

  if (!this.endDateTime && this.startDateTime) {
    this.endDateTime = new Date(this.startDateTime.getTime() + 30 * 60 * 1000);
  }

  if (this.startDateTime && this.endDateTime && this.startDateTime >= this.endDateTime) {
    this.invalidate("endDateTime", "Booking end time must be after start time.");
  }

  return next();
});

bookingSchema.virtual("date").get(function getDate() {
  return this.bookingDate;
});

bookingSchema.virtual("time").get(function getTime() {
  return this.slot;
});

bookingSchema.set("toJSON", {
  virtuals: true,
  transform(_, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Booking = mongoose.model("Booking", bookingSchema);
