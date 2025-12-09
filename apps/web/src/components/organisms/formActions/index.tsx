import React from "react";
import { Button } from "../../molecules/button";

interface FormActionsProps {
  submitText: string;
}

export const FormActions: React.FC<FormActionsProps> = ({ submitText }) => (
  <div className="mt-4">
    <Button type="submit" variant="primary" className="w-full">
      {submitText}
    </Button>
  </div>
);
