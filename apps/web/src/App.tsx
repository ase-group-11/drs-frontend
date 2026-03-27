// File: /web/src/App.tsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import AppRouter from './router';
import { AuthProvider } from './context/AuthContext';
import './App.css';
import ErrorBoundary from './components/organisms/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontSize: 14,
        },
      }}
    >
      <AntApp>
      <Router>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </Router>
      </AntApp>
    </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;