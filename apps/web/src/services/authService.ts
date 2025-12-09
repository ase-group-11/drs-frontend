import api from "./api";
import { ApiResponse } from "../types/auth";
import { AxiosResponse } from "axios";

export const requestOtp = (
  mobile_number: string
): Promise<AxiosResponse<ApiResponse>> => {
  return api.post("/auth/signup/request-otp", { mobile_number });
};

export const verifyOtp = (
  mobile_number: string,
  otp_code: string
): Promise<AxiosResponse<ApiResponse>> => {
  return api.post("/auth/signup/verify", { mobile_number, otp_code });
};
