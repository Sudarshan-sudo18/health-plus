import mongoose from "mongoose";

const userProfileSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    age: {
      type: Number,
      min: 0,
      max: 130,
      default: null
    },
    gender: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    emergencyContact: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },
    state: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },
    country: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },
    medicalConditions: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: ""
    },
    allergies: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: ""
    },
    designation: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },
    supportEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      default: ""
    },
    supportPhone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    profilePicture: {
      type: String,
      trim: true,
      maxlength: 500000,
      default: ""
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
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
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "doctor", "patient"]
    },
    termsAccepted: {
      type: Boolean,
      default: false
    },
    termsAcceptedAt: {
      type: Date,
      default: null
    },
    profile: {
      type: userProfileSchema,
      default: () => ({})
    },
    profileUpdatedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

userSchema.virtual("isProfileComplete").get(function getIsProfileComplete() {
  return isProfileComplete(this.role, this.profile || {});
});

userSchema.set("toJSON", {
  virtuals: true,
  transform(_, ret) {
    ret.id = ret._id.toString();
    ret.isProfileComplete = isProfileComplete(ret.role, ret.profile || {});
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  }
});

export const User = mongoose.model("User", userSchema);

function isProfileComplete(role, profile) {
  const requiredFields = {
    admin: ["fullName", "designation", "supportEmail"],
    doctor: ["fullName", "phone", "city", "country"],
    patient: ["fullName", "age", "gender", "phone", "emergencyContact", "city", "country"]
  }[role] || ["fullName"];

  return requiredFields.every((field) => {
    const value = profile[field];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });
}
