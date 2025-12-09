import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "../components/pages/login";
import { OtpPage } from "../components/pages/otp";
import { HomePage } from "../components/pages/home";

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/home" element={<HomePage />} />
    </Routes>
  </BrowserRouter>
);
