// File: /web/src/components/pages/DisasterReportsPage/DisasterReportsPage.tsx
import React from 'react';
import { AdminTemplate } from '../../templates';
import { DisasterReports } from '../../organisms';

const DisasterReportsPage: React.FC = () => {
  return (
    <AdminTemplate selectedKey="reports" breadcrumb="Disaster Reports / Active">
      <DisasterReports />
    </AdminTemplate>
  );
};

export default DisasterReportsPage;
