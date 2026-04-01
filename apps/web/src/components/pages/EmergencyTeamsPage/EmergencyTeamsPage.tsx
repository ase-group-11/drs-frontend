// NEW FILE
import React from 'react';
import EmergencyTeams from '../../organisms/EmergencyTeams/EmergencyTeams';
import { AdminTemplate } from '../../templates';

const EmergencyTeamsPage: React.FC = () => {
  return (
  <AdminTemplate selectedKey="teams" breadcrumb="Emergency Teams / All teams">
    <EmergencyTeams />
  </AdminTemplate>
  );
};

export default EmergencyTeamsPage;
