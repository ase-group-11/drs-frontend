import React from "react";

interface HomeTemplateProps {
  children: React.ReactNode;
}

export const HomeTemplate: React.FC<HomeTemplateProps> = ({ children }) => (
  <div className="min-h-screen bg-white p-6">{children}</div>
);
