import React from "react";

interface TextProps {
  children: React.ReactNode;
  className?: string;
}

export const Text: React.FC<TextProps> = ({ children, className = "" }) => (
  <p className={`text-gray-700 ${className}`}>{children}</p>
);
