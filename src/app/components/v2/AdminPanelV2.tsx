import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useUserManagement } from '../../context/UserManagementContext';
import { Shield, UserPlus, Trash2, LogOut, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminPanelV2() {
  const navigate = useNavigate();
  const { receptionists, adminCredentials, addReceptionist, removeReceptionist, updateAdminCredentials } = useUserManagement();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmittingReceptionist, setIsSubmittingReceptionist] = useState(false);

  // Estados para alterar credenciais admin
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem('adminAuth');
    if (!isAdmin) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingReceptionist) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');
    setIsSubmittingReceptionist(true);

    try {
      const success = await addReceptionist(name, username, password);
      if (success) {
        setSuccessMessage(`Recepcionista "${name}" cadastrado com sucesso!`);
        setName('');
        setUsername('');
        setPassword('');
      } else {
        setErrorMessage('Erro: Nome de usuário já existe');
      }
    } catch (error) {
      console.error('Error adding receptionist:', error);
      setErrorMessage('Erro ao cadastrar recepcionista. Tente novamente.');
    } finally {
      setIsSubmittingReceptionist(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o recepcionista "${name}"?`)) {
      try {
        await removeReceptionist(id);
        setSuccessMessage(`Recepcionista "${name}" removido com sucesso!`);
      } catch (error) {
        console.error('Error removing receptionist:', error);
        setErrorMessage('Erro ao remover recepcionista. Tente novamente.');
      }
    }
  };

  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingAdmin) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');

    if (newAdminPassword !== confirmAdminPassword) {
      setErrorMessage('As senhas não coincidem');
      return;
    }

    if (newAdminPassword.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsSubmittingAdmin(true);

    try {
      const success = await updateAdminCredentials(newAdminUsername, newAdminPassword);
      if (success) {
        setSuccessMessage('Credenciais de administrador atualizadas com sucesso!');
        setNewAdminUsername('');
        setNewAdminPassword('');
        setConfirmAdminPassword('');

        setTimeout(() => {
          sessionStorage.removeItem('adminAuth');
          navigate('/admin/login');
        }, 2000);
      } else {
        setErrorMessage('Erro ao atualizar credenciais');
        setIsSubmittingAdmin(false);
      }
    } catch (error) {
      console.error('Error updating admin credentials:', error);
      setErrorMessage('Erro ao atualizar credenciais. Tente novamente.');
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/src/imports/image.png" alt="CBTEA Logo" className="h-16" />
            <div>
              <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                <Shield className="w-10 h-10 text-purple-600" />
                Painel Administrativo
              </h1>
              <p className="text-gray-600 mt-2">Gerenciamento de recepcionistas</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        {successMessage && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Cadastrar Novo Recepcionista
              </CardTitle>
              <CardDescription>Adicione um novo usuário ao sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nome do recepcionista"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmittingReceptionist}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Login do recepcionista"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmittingReceptionist}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Senha de acesso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmittingReceptionist}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmittingReceptionist}>
                  {isSubmittingReceptionist ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Cadastrar Recepcionista
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recepcionistas Cadastrados</CardTitle>
              <CardDescription>{receptionists.length} usuários no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {receptionists.map((receptionist) => (
                  <div
                    key={receptionist.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{receptionist.name}</p>
                      <p className="text-sm text-gray-600">@{receptionist.username}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Cadastrado em {receptionist.createdAt.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(receptionist.id, receptionist.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Alterar Credenciais de Admin
              </CardTitle>
              <CardDescription>Atualize o usuário e senha do administrador</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateAdminCredentials} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                  <p className="text-blue-800 font-semibold mb-1">Credenciais Atuais:</p>
                  <p className="text-blue-700">Usuário: <span className="font-mono">{adminCredentials.username}</span></p>
                  <p className="text-blue-700">Senha: <span className="font-mono">{'•'.repeat(adminCredentials.password.length)}</span></p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newAdminUsername">Novo Usuário Admin</Label>
                  <Input
                    id="newAdminUsername"
                    type="text"
                    placeholder="Novo nome de usuário"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    disabled={isSubmittingAdmin}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newAdminPassword">Nova Senha Admin</Label>
                  <Input
                    id="newAdminPassword"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    disabled={isSubmittingAdmin}
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmAdminPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmAdminPassword"
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmAdminPassword}
                    onChange={(e) => setConfirmAdminPassword(e.target.value)}
                    disabled={isSubmittingAdmin}
                    required
                  />
                </div>

                <Alert className="border-orange-500 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 text-xs">
                    Após alterar as credenciais, você será desconectado e precisará fazer login novamente com as novas credenciais.
                  </AlertDescription>
                </Alert>

                <Button type="submit" className="w-full" variant="default" disabled={isSubmittingAdmin}>
                  {isSubmittingAdmin ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Atualizar Credenciais Admin
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>• Os recepcionistas cadastrados aqui poderão fazer login na área de recepção</p>
              <p>• Cada recepcionista terá acesso ao painel de chamadas e ao log de atendimentos</p>
              <p>• O sistema registra qual recepcionista chamou cada paciente</p>
              <p>• Não é possível que dois recepcionistas chamem o mesmo paciente simultaneamente</p>
              <p className="pt-2 border-t mt-3 text-purple-700 font-semibold">• Mantenha as credenciais de admin seguras e atualizadas regularmente</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
