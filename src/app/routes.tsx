import { createBrowserRouter } from 'react-router';
import type { ComponentType } from 'react';
import AppRouteError from './components/AppRouteError';
import RootLayout from './components/RootLayout';
import QrCodeScreenV2 from './components/v2/QrCodeScreenV2';
import QueuePositionScreenV2 from './components/v2/QueuePositionScreenV2';
import RegisterScreenV2 from './components/v2/RegisterScreenV2';
import WelcomeHome from './components/v2/WelcomeHome';

const LAZY_ROUTE_RETRY_KEY = 'cbtea:lazy-route-retry';
const DYNAMIC_IMPORT_ERROR_MARKERS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'ChunkLoadError',
];

function isDynamicImportError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return DYNAMIC_IMPORT_ERROR_MARKERS.some((marker) => error.message.includes(marker));
}

async function loadLazyRouteModule<T>(loader: () => Promise<T>): Promise<T> {
  try {
    const module = await loader();

    if (typeof window !== 'undefined') {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (sessionStorage.getItem(LAZY_ROUTE_RETRY_KEY) === currentPath) {
        sessionStorage.removeItem(LAZY_ROUTE_RETRY_KEY);
      }
    }

    return module;
  } catch (error) {
    if (typeof window !== 'undefined' && isDynamicImportError(error)) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const lastRetriedPath = sessionStorage.getItem(LAZY_ROUTE_RETRY_KEY);

      if (lastRetriedPath !== currentPath) {
        sessionStorage.setItem(LAZY_ROUTE_RETRY_KEY, currentPath);
        window.location.reload();
        return new Promise<T>(() => {});
      }

      sessionStorage.removeItem(LAZY_ROUTE_RETRY_KEY);
    }

    throw error;
  }
}

const lazyComponent = <T extends { default: ComponentType<any> }>(
  loader: () => Promise<T>,
) => {
  return async () => {
    const module = await loadLazyRouteModule(loader);
    return { Component: module.default };
  };
};

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    errorElement: <AppRouteError />,
    children: [
      {
        path: '/',
        Component: WelcomeHome,
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
        Component: QrCodeScreenV2,
      },
      {
        path: '/:unitSlug/fila',
        Component: QueuePositionScreenV2,
      },
      {
        path: '/:unitSlug',
        Component: RegisterScreenV2,
      },
    ],
  },
]);
