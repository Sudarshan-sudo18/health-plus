import { sendEmailVerificationOtp, verifyEmailOtp } from "../otp/otp.service.js";

export async function resendEmailVerification(req, res, next) {
  try {
    const verification = await sendEmailVerificationOtp(req.user);
    res.json({
      message: "Verification code sent.",
      verification
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const user = await verifyEmailOtp(req.user, req.body?.code);
    res.json({
      message: "Email verified.",
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
}
