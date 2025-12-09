import React from "react";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactElement; 
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  icon,
  error,
  className,
  ...rest
}) => {
  return (
    <div className="w-full">
      <div
        className={`
          flex items-center gap-3 w-full px-4 py-3 rounded-xl border 
          transition-all bg-white shadow-sm
          ${
            error
              ? "border-danger focus-within:ring-danger/30"
              : "border-gray300 focus-within:ring-primary/30"
          }
          focus-within:ring-4
        `}
      >
        {icon && <span className="text-gray500">{icon}</span>}

        <input
          {...rest}
          className="w-full outline-none text-gray700 placeholder-gray400 bg-transparent"
        />
      </div>

      {error && (
        <p className="text-sm text-danger mt-1 ml-1">{error}</p>
      )}
    </div>
  );
};
