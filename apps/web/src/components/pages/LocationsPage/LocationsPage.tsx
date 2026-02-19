// NEW FILE
import React from 'react';
import Locations from '../../organisms/Locations/Locations';
import { AdminTemplate } from '../../templates';

const LocationsPage: React.FC = () => {
  return (
  <AdminTemplate selectedKey="locations" breadcrumb="Locations & Zones / Overview">
    <Locations />
  </AdminTemplate>
  );
};

export default LocationsPage;
