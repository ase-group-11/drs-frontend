// import { useLocation, useNavigate } from "react-router-dom";
// import { AuthTemplate } from "../../templates/auth";
// import { OtpVerificationForm } from "../../organisms/OtpVerificationForm";
// import { useAuth } from "../../../hooks/useAuth";

// export const OtpPage = () => {
//   const { state } = useLocation();
//   const navigate = useNavigate();
//   const { validateOtp, sendOtp, loading } = useAuth();

//   const phone = state?.phoneNumber;

//   const handleVerify = async (otp: string) => {
//     try {
//       const res = await validateOtp(phone, otp);

//       console.log("OTP Response:", res);

//       if (res.status === 201) {
//         navigate("/home");
//       } else {
//         alert(res.data?.message || "Invalid OTP");
//       }
//     } catch (err: any) {
//       alert(err.data?.message || "Something went wrong");
//     }
//   };

//   const handleResend = () => sendOtp(phone);

//   return (
//     <AuthTemplate>
//       <OtpVerificationForm
//         phoneNumber={phone}
//         loading={loading}
//         onVerify={handleVerify}
//         onResend={handleResend}
//       />
//     </AuthTemplate>
//   );
// };

import { useLocation, useNavigate } from "react-router-dom";
import { AuthTemplate } from "../../templates/auth";
import { OtpVerificationForm } from "../../organisms/OtpVerificationForm";
import { useAuth } from "../../../hooks/useAuth";

export const OtpPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { validateOtp, sendOtp, loading } = useAuth();

  const phone = state?.phoneNumber;

  // --- Extract backend message safely ---
  const getErrorMessage = (err: any) => {
    return (
      err?.response?.data?.message ||
      err?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again."
    );
  };

  const handleVerify = async (otp: string) => {
    try {
      const res = await validateOtp(phone, otp);
      const status = res?.status;
      const message = res?.data?.message;

      console.log("OTP Response:", res);

      switch (status) {
        case 200:
        case 201:
          navigate("/home");
          break;

        case 400:
          alert(message || "Invalid or expired OTP.");
          break;

        case 401:
          alert(message || "Unauthorized! OTP is incorrect.");
          break;

        case 404:
          alert(message || "User not found.");
          break;

        case 429:
          alert(message || "Too many attempts. Try again later.");
          break;

        case 500:
        default:
          alert(message || "Server error! Please try again later.");
          break;
      }
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleResend = async () => {
    try {
      const res = await sendOtp(phone);
      const status = res?.status;
      const message = res?.data?.message;

      switch (status) {
        case 200:
        case 201:
          alert(message || "OTP resent successfully!");
          break;

        case 400:
          alert(message || "Cannot resend OTP right now.");
          break;

        case 429:
          alert(message || "Too many resend attempts. Try after some time.");
          break;

        default:
          alert(message || "Failed to resend OTP.");
          break;
      }
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <AuthTemplate>
      <OtpVerificationForm
        phoneNumber={phone}
        loading={loading}
        onVerify={handleVerify}
        onResend={handleResend}
      />
    </AuthTemplate>
  );
};
