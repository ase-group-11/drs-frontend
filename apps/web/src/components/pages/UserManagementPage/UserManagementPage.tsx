// NEW FILE
import React from 'react';
import AdminTemplate from '../../templates/AdminTemplate';
import UserManagement from '../../organisms/UserManagement';

const UserManagementPage: React.FC = () => {
  return (
    <AdminTemplate selectedKey="users" breadcrumb="User Management / All Users">
      <UserManagement />
    </AdminTemplate>
  );
};

export default UserManagementPage;
