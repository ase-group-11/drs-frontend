export const authRoutes = {
  requestOtp: 'RequestOtp',
  verifyOtp: 'VerifyOtp',
} as const;

export type AuthRouteName = (typeof authRoutes)[keyof typeof authRoutes];