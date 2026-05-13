import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../context/AuthContext';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginScreenV2() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(false);
    setIsSubmitting(true);

    try {
      const success = await login(username, password);
      if (success) {
        navigate('/recepcao');
      } else {
        setError(true);
        setPassword('');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error during login:', error);
      setError(true);
      setPassword('');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src="/src/imports/image.png" alt="CBTEA Logo" className="h-12 sm:h-16" />
          </div>
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl">Área da Recepção</CardTitle>
          <CardDescription className="text-sm sm:text-base">Faça login para acessar o painel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Usuário ou senha incorretos
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  <span className="text-sm sm:text-base">Entrando...</span>
                </>
              ) : (
                <span className="text-sm sm:text-base">Entrar</span>
              )}
            </Button>

            <div className="text-center text-xs sm:text-sm text-gray-500 mt-4 space-y-2">
              <p>Credenciais de teste:</p>
              <p className="font-mono text-xs break-all px-2">usuário: recepcao / senha: cbtea2024</p>
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/admin/login')}
                  className="text-xs sm:text-sm"
                >
                  Acesso Administrativo
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
