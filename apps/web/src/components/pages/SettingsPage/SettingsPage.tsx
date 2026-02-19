// NEW FILE
import React from 'react';
import Settings from '../../organisms/Settings/Settings';
import { AdminTemplate } from '../../templates';

const SettingsPage: React.FC = () => {
  return (
  <AdminTemplate selectedKey="settings" breadcrumb="Settings / Overview">
    <Settings />
  </AdminTemplate>
  );
};

export default SettingsPage;
