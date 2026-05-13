import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { useUserManagement } from '../../context/UserManagementContext';

export default function AdminLoginScreenV2() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { validateAdmin, adminCredentials } = useUserManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(false);
    setIsSubmitting(true);

    try {
      const isValid = await validateAdmin(username, password);
      if (isValid) {
        sessionStorage.setItem('adminAuth', 'true');
        navigate('/admin');
      } else {
        setError(true);
        setPassword('');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error during admin login:', error);
      setError(true);
      setPassword('');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src="/src/imports/image.png" alt="CBTEA Logo" className="h-12 sm:h-16" />
          </div>
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-200 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Área Administrativa</CardTitle>
          <CardDescription className="text-sm sm:text-base">Acesso restrito a administradores</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Credenciais de administrador incorretas
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Usuário Admin</Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite o usuário admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha Admin</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha admin"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  <span className="text-sm sm:text-base">Entrando...</span>
                </>
              ) : (
                <span className="text-sm sm:text-base">Entrar como Admin</span>
              )}
            </Button>

            <div className="text-center text-xs sm:text-sm text-gray-500 mt-4">
              <p>Credenciais admin padrão:</p>
              <p className="font-mono text-xs mt-1 break-all px-2">usuário: {adminCredentials.username} / senha: {adminCredentials.password}</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
