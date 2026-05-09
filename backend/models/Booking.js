import mongoose from "mongoose";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "completed"];
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
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending",
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
