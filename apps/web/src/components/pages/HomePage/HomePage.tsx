import React from 'react';
import { Button } from 'antd';
import { useAuth } from '../../../hooks';
import './HomePage.css';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="home-page">
      <div className="home-container">
        <h1>Welcome to DRS</h1>
        <div className="user-info">
          <h2>User Information</h2>
          <p><strong>Name:</strong> {user?.fullName}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Department:</strong> {user?.department}</p>
          <p><strong>Employee ID:</strong> {user?.employeeId}</p>
        </div>
        <Button type="primary" size="large" onClick={logout}>
          Logout
        </Button>
      </div>
    </div>
  );
};

export default HomePage;