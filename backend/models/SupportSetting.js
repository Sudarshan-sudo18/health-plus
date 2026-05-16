import mongoose from "mongoose";

const supportSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "platform",
      unique: true,
      index: true
    },
    supportEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 160
    },
    supportPhone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: ""
    },
    supportTiming: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "Monday to Friday, 9:00 AM - 6:00 PM"
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  { timestamps: true }
);

supportSettingSchema.set("toJSON", {
  transform(_, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const SupportSetting = mongoose.model("SupportSetting", supportSettingSchema);
