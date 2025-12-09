import { useLocation, useNavigate } from "react-router-dom";
import { AuthTemplate } from "../../templates/auth";
import { OtpVerificationForm } from "../../organisms/OtpVerificationForm";

export const OtpPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const phone = state?.phoneNumber || "Unknown number";

  return (
    <AuthTemplate>
      <OtpVerificationForm
        phoneNumber={phone}
        onVerify={() => navigate("/home")}
        onResend={() => alert("OTP Resent")}
      />
    </AuthTemplate>
  );
};
