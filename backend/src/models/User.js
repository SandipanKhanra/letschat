import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    // Store hashed refresh tokens to allow multiple active sessions/devices.
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        used: { type: Boolean, default: false },
        meta: { type: Object, default: {} },
      },
    ],
  },
  { timestamps: true } //CreatedAt and UpdatedAt fields will be added automatically
);
const User = mongoose.model("User", userSchema);

export default User;
