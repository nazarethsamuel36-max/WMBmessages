import React from 'react';
import { AppContextProvider } from '../context/AppContext';
import { AppShell } from '../components/layout/AppShell';

export const DockPage: React.FC = () => {
  return (
    <AppContextProvider>
      <AppShell />
    </AppContextProvider>
  );
};
export default DockPage;
