// File: /web/src/App.tsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppRouter from './router';
import { AuthProvider } from './context/AuthContext';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontSize: 14,
        },
      }}
    >
      <Router>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
};

export default App;