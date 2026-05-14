import { Outlet } from 'react-router';
import { ConnectionStatus } from './ConnectionStatus';

export default function RootLayout() {
  return (
    <>
      <ConnectionStatus />
      <Outlet />
    </>
  );
}
