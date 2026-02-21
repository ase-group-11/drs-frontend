// NEW FILE
import React from 'react';
import Settings from '../../organisms/Settings/Settings';
import { AdminTemplate } from '../../templates';

const SettingsPage: React.FC = () => {
  return (
  <AdminTemplate selectedKey="settings" breadcrumb="Settings / General">
    <Settings />
  </AdminTemplate>
  );
};

export default SettingsPage;
