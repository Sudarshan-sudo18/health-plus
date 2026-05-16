import mongoose from "mongoose";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const availabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: WEEK_DAYS,
      trim: true
    },
    slots: {
      type: [
        {
          type: String,
          required: true,
          trim: true,
          match: [SLOT_PATTERN, "Slots must use HH:mm 24-hour format."]
        }
      ],
      default: [],
      validate: {
        validator(slots) {
          return Array.isArray(slots) && new Set(slots).size === slots.length;
        },
        message: "Availability slots must be unique for each day."
      }
    }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
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
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  qualification: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 180
  },
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0,
    max: 80
  },
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  profilePicture: {
    type: String,
    trim: true,
    maxlength: 500000,
    default: ""
  },
  consultationMode: {
    type: String,
    enum: ["online", "offline", "both"],
    default: "online"
  },
  consultationDuration: {
    type: Number,
    min: 5,
    max: 240,
    default: 30
  },
  hospitalAffiliation: {
    type: String,
    trim: true,
    maxlength: 180,
    default: ""
  },
  clinicName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 160
  },
  clinicAddress: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 300
  },
  bio: {
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 1200
  },
  languagesSpoken: {
    type: [
      {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 40
      }
    ],
    required: true,
    validate: {
      validator(languages) {
        return Array.isArray(languages) && languages.length > 0 && new Set(languages).size === languages.length;
      },
      message: "At least one unique spoken language is required."
    }
  },
  availability: {
    type: [availabilitySchema],
    default: [],
    validate: {
      validator(availability) {
        const days = availability.map((item) => item.day);
        return new Set(days).size === days.length;
      },
      message: "Availability days must be unique."
    }
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rejectionReason: {
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

doctorSchema.virtual("name").get(function getName() {
  return this.fullName;
});

doctorSchema.set("toJSON", {
  virtuals: true,
  transform(_, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Doctor = mongoose.model("Doctor", doctorSchema);
