import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled"],
    default: "pending"
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Booking = mongoose.model("Booking", bookingSchema);
