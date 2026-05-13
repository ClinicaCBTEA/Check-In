import { RouterProvider } from 'react-router';
import { router } from './routes';
import { SimpleQueueProvider } from './context/SimpleQueueContext';
import { UserManagementProvider } from './context/UserManagementContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <UserManagementProvider>
      <AuthProvider>
        <SimpleQueueProvider>
          <RouterProvider router={router} />
        </SimpleQueueProvider>
      </AuthProvider>
    </UserManagementProvider>
  );
}