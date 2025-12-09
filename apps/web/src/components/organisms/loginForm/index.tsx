// import React, { useState } from "react";
// import { Input } from "../../molecules/input";
// import { Button } from "../../molecules/button";
// import { FiPhone } from "react-icons/fi";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../../hooks/useAuth";

// export const LoginForm: React.FC = () => {
//   const navigate = useNavigate();
//   const { sendOtp, loading } = useAuth();

//   const [phone, setPhone] = useState("");
//   const [error, setError] = useState("");

//   const validate = () => {
//     if (!/^\d{10}$/.test(phone)) {
//       setError("Enter valid 10-digit phone number");
//       return false;
//     }
//     setError("");
//     return true;
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       const res = await sendOtp(phone);

//       if (res.status === 200) {
//         navigate("/otp", { state: { phoneNumber: phone } });
//       } else {
//         setError(res.data?.message || "Failed to send OTP");
//       }
//     } catch (err: any) {
//       setError(err.data?.message || "Something went wrong");
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       <h2 className="text-3xl font-bold text-center">Welcome Back</h2>

//       <p className="text-center text-gray-500">
//         Enter your phone number to continue
//       </p>

//       <Input
//         icon={<FiPhone />}
//         placeholder="9876543210"
//         value={phone}
//         error={error}
//         onChange={(e) => setPhone(e.target.value)}
//       />

//       <Button type="submit" className="w-full" size="md" disabled={loading}>
//         {loading ? "Sending..." : "→ Send OTP"}
//       </Button>
//     </form>
//   );
// };


import React, { useState } from "react";
import { Input } from "../../molecules/input";
import { Button } from "../../molecules/button";
import { FiPhone } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { sendOtp, loading } = useAuth();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  // Safely extract backend messages
  const getMessage = (err: any) =>
    err?.response?.data?.message ||
    err?.data?.message ||
    err?.message ||
    "Something went wrong. Please try again.";

  const validate = () => {
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter valid 10-digit phone number");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      console.log("checking")
      const res = await sendOtp(phone);
      const status = res?.status;
      const message = res?.data?.message;

      console.log("checking with console : "+res)

      switch (status) {
        case 200:
        case 201:
          navigate("/otp", { state: { phoneNumber: phone } });
          break;

        case 400:
          setError(message || "Invalid phone number.");
          break;

        case 401:
          setError(message || "Unauthorized.");
          break;

        case 404:
          setError(message || "User not found.");
          break;

        case 429:
          setError(message || "Too many attempts. Try again later.");
          break;

        case 500:
        default:
          setError(message || "Failed to send OTP. Try again later.");
          break;
      }
    } catch (err: any) {
      setError(getMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-3xl font-bold text-center">Welcome</h2>

      <p className="text-center text-gray-500">
        Enter your phone number to continue
      </p>

      <Input
        icon={<FiPhone />}
        placeholder="9876543210"
        value={phone}
        error={error}
        onChange={(e) => setPhone(e.target.value)}
      />

      <Button type="submit" className="w-full" size="md" disabled={loading}>
        {loading ? "Sending..." : "→ Send OTP"}
      </Button>
    </form>
  );
};
