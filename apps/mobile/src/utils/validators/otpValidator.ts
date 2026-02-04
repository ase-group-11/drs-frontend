export function isValidOtp(otp: string, expectedLength = 6): boolean {
  if (!otp) {
    return false;
  }

  const trimmed = otp.trim();
  const otpRegex = new RegExp(`^\\d{${expectedLength}}$`);

  return otpRegex.test(trimmed);
}