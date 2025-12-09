// import React, { useState } from "react";
// import { Input } from "../../molecules/input";
// import { Button } from "../../molecules/button";
// import { FiPhone, FiLock } from "react-icons/fi";


// interface FormState {
//   contactNumber: string;
//   password: string;
// }

// interface FormErrors {
//   contactNumber?: string;
//   password?: string;
// }

// export const LoginForm: React.FC = () => {
//   const [form, setForm] = useState<FormState>({
//     contactNumber: "",
//     password: "",
//   });

//   const [errors, setErrors] = useState<FormErrors>({});

//   const validate = () => {
//     const e: FormErrors = {};

//     if (!/^\d{10}$/.test(form.contactNumber))
//       e.contactNumber = "Enter valid 10-digit phone number";

//     if (!form.password || form.password.length < 6)
//       e.password = "Password must be at least 6 characters";

//     setErrors(e);
//     return Object.keys(e).length === 0;
//   };

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (!validate()) return;

//     alert("Login Success");
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">

//       <h2 className="text-3xl font-bold text-center text-textDark">
//         Welcome Back
//       </h2>

//       <p className="text-center text-gray500 mb-6">
//         Sign in to access your dashboard
//       </p>

//       <Input
//         icon={<FiPhone />}
//         placeholder="9876543210"
//         value={form.contactNumber}
//         error={errors.contactNumber}
//         onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//           setForm({ ...form, contactNumber: e.target.value })
//         }
//       />

//       <Input
//         icon={<FiLock />}
//         type="password"
//         placeholder="••••••••"
//         value={form.password}
//         error={errors.password}
//         onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
//           setForm({ ...form, password: e.target.value })
//         }
//       />

//       <Button type="submit" className="w-full" size="md">
//         → Sign In
//       </Button>

//       <p className="text-center mt-2">
//         <span className="text-gray500 mr-1">Don't have an account?</span>
//         <Button variant="link" onClick={() => alert("Signup clicked")}>
//           Sign up
//         </Button>
//       </p>
//     </form>
//   );
// };


import React, { useState } from "react";
import { Input } from "../../molecules/input";
import { Button } from "../../molecules/button";
import { FiPhone } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const validate = () => {
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter valid 10-digit phone number");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validate()) return;

    // Navigate to OTP screen with phone number
    navigate("/otp", { state: { phoneNumber: phone } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      <h2 className="text-3xl font-bold text-center text-textDark">
        Welcome Back
      </h2>

      <p className="text-center text-gray500 mb-6">
        Enter your phone number to continue
      </p>

      <Input
        icon={<FiPhone />}
        placeholder="9876543210"
        value={phone}
        error={error}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setPhone(e.target.value)
        }
      />

      <Button type="submit" className="w-full" size="md">
        → Send OTP
      </Button>

      <p className="text-center mt-2">
        <span className="text-gray500 mr-1">Don’t have an account?</span>
        <Button variant="link" onClick={() => alert("Signup clicked")}>
          Sign up
        </Button>
      </p>
    </form>
  );
};
