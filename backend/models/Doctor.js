import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  availability: [
    {
      day: {
        type: String,
        trim: true
      },
      slots: [
        {
          type: String,
          trim: true
        }
      ]
    }
  ],
  isApproved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Doctor = mongoose.model("Doctor", doctorSchema);
