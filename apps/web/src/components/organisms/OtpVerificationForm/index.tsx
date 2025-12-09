import React, { useState } from "react";
import { Input } from "../../molecules/input";
import { Button } from "../../molecules/button";

interface Props {
  phoneNumber: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  loading?: boolean;
}

export const OtpVerificationForm: React.FC<Props> = ({
  phoneNumber,
  onVerify,
  onResend,
  loading,
}) => {
  const [otp, setOtp] = useState("");

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center">Verify OTP</h2>

      <p className="text-center text-gray-500">
        Code sent to <strong>{phoneNumber}</strong>
      </p>

      <Input
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="text-center tracking-widest text-xl"
      />

      <Button
        onClick={() => onVerify(otp)}
        className="w-full"
        disabled={loading}
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </Button>

      <Button variant="link" onClick={onResend} className="w-full">
        Resend OTP
      </Button>
    </div>
  );
};
