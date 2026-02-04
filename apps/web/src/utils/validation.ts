export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateIrishMobile = (mobile: string): boolean => {
  const irishMobileRegex = /^8\d{8}$/;
  return irishMobileRegex.test(mobile);
};

export const validateIndianMobile = (mobile: string): boolean => {
  const indianMobileRegex = /^[6-9]\d{9}$/;
  return indianMobileRegex.test(mobile);
};