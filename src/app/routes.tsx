import { createBrowserRouter } from 'react-router';
import type { ComponentType } from 'react';
import RootLayout from './components/RootLayout';

const lazyComponent = <T extends { default: ComponentType<any> }>(
  loader: () => Promise<T>,
) => {
  return async () => {
    const module = await loader();
    return { Component: module.default };
  };
};

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: '/',
        lazy: lazyComponent(() => import('./components/v2/WelcomeHome')),
      },
      {
        path: '/qrcode',
        lazy: lazyComponent(() => import('./components/v2/QrCodeScreenV2')),
      },
      {
        path: '/fila',
        lazy: lazyComponent(() => import('./components/v2/QueuePositionScreenV2')),
      },
      {
        path: '/login',
        lazy: lazyComponent(() => import('./components/v2/LoginScreenV2')),
      },
      {
        path: '/recepcao',
        lazy: lazyComponent(() => import('./components/v2/ReceptionScreenV2')),
      },
      {
        path: '/log',
        lazy: lazyComponent(() => import('./components/v2/LogScreenV2Enhanced')),
      },
      {
        path: '/admin/login',
        lazy: lazyComponent(() => import('./components/v2/AdminLoginScreenV2')),
      },
      {
        path: '/admin',
        lazy: lazyComponent(() => import('./components/v2/AdminPanelV2')),
      },
      {
        path: '/:unitSlug/qrcode',
        lazy: lazyComponent(() => import('./components/v2/QrCodeScreenV2')),
      },
      {
        path: '/:unitSlug/fila',
        lazy: lazyComponent(() => import('./components/v2/QueuePositionScreenV2')),
      },
      {
        path: '/:unitSlug',
        lazy: lazyComponent(() => import('./components/v2/RegisterScreenV2')),
      },
    ],
  },
]);
