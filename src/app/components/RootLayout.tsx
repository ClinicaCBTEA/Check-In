import { Outlet } from 'react-router';
import DebugMenu from './DebugMenu';
import { ConnectionStatus } from './ConnectionStatus';

export default function RootLayout() {
  return (
    <>
      <ConnectionStatus />
      <Outlet />
      <DebugMenu />
    </>
  );
}
