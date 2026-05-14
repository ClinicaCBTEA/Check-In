import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SimpleQueueProvider } from './context/SimpleQueueContext';
import { UserManagementProvider } from './context/UserManagementContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <UserManagementProvider>
        <SimpleQueueProvider>
          <RouterProvider router={router} />
        </SimpleQueueProvider>
      </UserManagementProvider>
    </AuthProvider>
  );
}
