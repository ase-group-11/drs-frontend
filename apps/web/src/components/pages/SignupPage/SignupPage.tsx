import React from 'react';
import { AuthTemplate } from '../../templates';
import { SignupForm } from '../../organisms';
import './SignupPage.css';

const SignupPage: React.FC = () => {
  return (
    <AuthTemplate 
      title="Create Your Account" 
      subtitle="Join the Disaster Response System"
    >
      <SignupForm />
    </AuthTemplate>
  );
};

export default SignupPage;