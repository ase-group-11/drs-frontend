import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className = "",
}) => {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-sm",
    lg: "px-6 py-4 text-base",
  };

  const variants = {
    primary:
      "bg-primary text-white hover:bg-primaryDark shadow-md focus:ring-4 focus:ring-primary/30",
    secondary:
      "bg-gray100 border border-gray300 text-textDark hover:bg-gray300",
    link: "text-primary hover:underline bg-transparent shadow-none p-0",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
};
