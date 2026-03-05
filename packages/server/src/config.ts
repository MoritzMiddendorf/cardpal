export const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const parsedOtpHours = parseInt(process.env['OTP_VALIDITY_HOURS'] ?? '12', 10);
export const OTP_VALIDITY_HOURS = Number.isFinite(parsedOtpHours) && parsedOtpHours > 0 ? parsedOtpHours : 12;
