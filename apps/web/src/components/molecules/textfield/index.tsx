import React from "react";
import { Input } from "../input";

const TextField = ({
  label,
  error,
  ...props
}: any) => {
  return (
    <div className="mb-5">
      <label className="block mb-1 text-gray-700 font-medium">{label}</label>
      <Input error={error} {...props} />
    </div>
  );
};

export default TextField