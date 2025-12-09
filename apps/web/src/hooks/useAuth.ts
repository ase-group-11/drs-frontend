import { useState } from "react";
import { requestOtp, verifyOtp } from "../services/authService";
import { AxiosResponse } from "axios";
import { ApiResponse } from "../types/auth";

export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  const sendOtp = async (
    phone: string
  ): Promise<AxiosResponse<ApiResponse>> => {
    setLoading(true);
    try {
      return await requestOtp(`+91${phone}`);
    } finally {
      setLoading(false);
    }
  };

  const validateOtp = async (
    phone: string,
    otp: string
  ): Promise<AxiosResponse<ApiResponse>> => {
    setLoading(true);
    try {
      return await verifyOtp(`+91${phone}`, otp);
    } finally {
      setLoading(false);
    }
  };

  return { loading, sendOtp, validateOtp };
};
