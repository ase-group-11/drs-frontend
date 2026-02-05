export type Salutation = 'mr' | 'ms' | 'mrs' | 'dr' | 'prof';
export type UserRole = 'admin' | 'manager' | 'staff';
export type Department = 'medical' | 'police' | 'it' | 'fire';

export interface User {
  userId: string;
  phoneNumber: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: Department;
  employeeId?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface SignupFormData {
  salutation: Salutation;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: Department;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface OtpVerificationData {
  mobileNumber: string;
  otpCode: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}