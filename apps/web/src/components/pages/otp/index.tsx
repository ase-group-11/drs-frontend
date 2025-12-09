import { useLocation, useNavigate } from "react-router-dom";
import { AuthTemplate } from "../../templates/auth";
import { OtpVerificationForm } from "../../organisms/OtpVerificationForm";
import { useAuth } from "../../../hooks/useAuth";

export const OtpPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { validateOtp, sendOtp, loading } = useAuth();

  const phone = state?.phoneNumber;

  const handleVerify = async (otp: string) => {
    try {
      const res = await validateOtp(phone, otp);

      console.log("OTP Response:", res);

      if (res.status === 201) {
        navigate("/home");
      } else {
        alert(res.data?.message || "Invalid OTP");
      }
    } catch (err: any) {
      alert(err.data?.message || "Something went wrong");
    }
  };

  const handleResend = () => sendOtp(phone);

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
