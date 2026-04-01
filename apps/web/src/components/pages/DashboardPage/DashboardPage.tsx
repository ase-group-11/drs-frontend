// File: /web/src/components/pages/DashboardPage/DashboardPage.tsx
import React from 'react';
import { AdminTemplate } from '../../templates';
import { Dashboard } from '../../organisms';

const DashboardPage: React.FC = () => {
  return (
    <AdminTemplate selectedKey="dashboard" breadcrumb="Dashboard / Overview">
      <Dashboard />
    </AdminTemplate>
  );
};

export default DashboardPage;
