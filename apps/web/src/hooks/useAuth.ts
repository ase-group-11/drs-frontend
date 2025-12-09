// import { useState } from "react";
// import { requestOtp, verifyOtp } from "../services/authService";
// import { AxiosResponse } from "axios";
// import { ApiResponse } from "../types/auth";

// export const useAuth = () => {
//   const [loading, setLoading] = useState(false);

//   const sendOtp = async (
//     phone: string
//   ): Promise<AxiosResponse<ApiResponse>> => {
//     setLoading(true);
//     try {
//       return await requestOtp(`+91${phone}`);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const validateOtp = async (
//     phone: string,
//     otp: string
//   ): Promise<AxiosResponse<ApiResponse>> => {
//     setLoading(true);
//     try {
//       return await verifyOtp(`+91${phone}`, otp);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { loading, sendOtp, validateOtp };
// };

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
      const res = await requestOtp(`+91${phone}`);

      // console.log("▶ OTP API Response");
      console.log("Status:", res.status);
      console.log("Data:", res.data);

      return res;
    } catch (err: any) {
      throw {
        status: err?.response?.status,
        data: err?.response?.data,
        message:
          err?.response?.data?.message ||
          err?.data?.detail || // <-- ADD THIS
          "OTP request failed",
      };
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
      const res = await verifyOtp(`+91${phone}`, otp);

      console.log("▶ Validate OTP Response");
      console.log("Status:", res.status);
      console.log("Data:", res.data);

      return res;
    } catch (err: any) {
      console.error("❌ Validate OTP Error:", err?.response?.data || err);

      throw {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.response?.data?.message || "OTP validation failed",
      };
    } finally {
      setLoading(false);
    }
  };

  return { loading, sendOtp, validateOtp };
};
