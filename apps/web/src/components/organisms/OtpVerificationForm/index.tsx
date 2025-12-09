import React, { useState } from "react";
import { Input } from "../../molecules/input";
import { Button } from "../../molecules/button";

export const OtpVerificationForm = ({
  phoneNumber,
  onVerify,
  onResend,
}: {
  phoneNumber: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
}) => {
  const [otp, setOtp] = useState("");

  return (
    <div className="space-y-6">

      <h2 className="text-3xl font-bold text-center text-textDark">
        Verify OTP
      </h2>

      <p className="text-center text-gray500">
        Code sent to <strong>{phoneNumber}</strong>
      </p>

      <Input
        placeholder="Enter OTP"
        value={otp}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setOtp(e.target.value)
        }
        className="text-center tracking-widest text-xl"
      />

      <Button onClick={() => onVerify(otp)} className="w-full">
        Verify OTP
      </Button>

      <Button variant="link" onClick={onResend} className="w-full text-center">
        Resend OTP
      </Button>

    </div>
  );
};
