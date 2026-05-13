import { createBrowserRouter } from 'react-router';
import RootLayout from './components/RootLayout';
import QrCodeScreenV2 from './components/v2/QrCodeScreenV2';
import RegisterScreenV2 from './components/v2/RegisterScreenV2';
import QueuePositionScreenV2 from './components/v2/QueuePositionScreenV2';
import LoginScreenV2 from './components/v2/LoginScreenV2';
import ReceptionScreenV2 from './components/v2/ReceptionScreenV2';
import LogScreenV2Enhanced from './components/v2/LogScreenV2Enhanced';
import AdminLoginScreenV2 from './components/v2/AdminLoginScreenV2';
import AdminPanelV2 from './components/v2/AdminPanelV2';

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: '/',
        Component: RegisterScreenV2,
      },
      {
        path: '/qrcode',
        Component: QrCodeScreenV2,
      },
      {
        path: '/fila',
        Component: QueuePositionScreenV2,
      },
      {
        path: '/login',
        Component: LoginScreenV2,
      },
      {
        path: '/recepcao',
        Component: ReceptionScreenV2,
      },
      {
        path: '/log',
        Component: LogScreenV2Enhanced,
      },
      {
        path: '/admin/login',
        Component: AdminLoginScreenV2,
      },
      {
        path: '/admin',
        Component: AdminPanelV2,
      },
    ]
  },
]);
