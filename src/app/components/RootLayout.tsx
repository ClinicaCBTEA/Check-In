import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { APP_NAME } from '../branding';
import { ConnectionStatus } from './ConnectionStatus';

export default function RootLayout() {
  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  return (
    <>
      <ConnectionStatus />
      <Outlet />
    </>
  );
}
