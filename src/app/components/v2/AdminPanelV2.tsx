import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useUserManagement } from '../../context/UserManagementContext';
import { useAuth } from '../../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { Shield, UserPlus, Trash2, LogOut, AlertCircle, CheckCircle, Loader2, Building2, Pencil } from 'lucide-react';
import logo from '../../../imports/image.png';

function AdminPanelContent() {
  const navigate = useNavigate();
  const { logoutAdmin } = useAuth();
  const {
    units,
    receptionists,
    adminCredentials,
    addReceptionist,
    removeReceptionist,
    updateReceptionistUnits,
    updateAdminCredentials,
    addUnit,
    updateUnitRecord,
    removeUnit,
    refreshUnits,
  } = useUserManagement();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmittingReceptionist, setIsSubmittingReceptionist] = useState(false);

  const [newUnitSlug, setNewUnitSlug] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAddress, setNewUnitAddress] = useState('');
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);

  const [editUnitId, setEditUnitId] = useState<string | null>(null);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitAddress, setEditUnitAddress] = useState('');
  const [editUnitSlug, setEditUnitSlug] = useState('');

  const [allocationOpen, setAllocationOpen] = useState(false);
  const [allocationRecId, setAllocationRecId] = useState<string | null>(null);
  const [allocationRecName, setAllocationRecName] = useState('');
  const [allocationUnits, setAllocationUnits] = useState<string[]>([]);
  const [isSavingAllocation, setIsSavingAllocation] = useState(false);

  // Estados para alterar credenciais admin
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  useEffect(() => {
    setSelectedUnitIds((prev) => {
      if (prev.length > 0) {
        return prev;
      }
      if (units.length > 0) {
        return [units[0].id];
      }
      return [];
    });
  }, [units]);

  useEffect(() => {
    if (adminCredentials.username && !newAdminUsername) {
      setNewAdminUsername(adminCredentials.username);
    }
  }, [adminCredentials.username, newAdminUsername]);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/admin/login');
  };

  const toggleNewRecUnit = (id: string) => {
    setSelectedUnitIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length > 0 ? next : prev;
      }
      return [...prev, id];
    });
  };

  const toggleAllocationUnit = (id: string) => {
    setAllocationUnits((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length > 0 ? next : prev;
      }
      return [...prev, id];
    });
  };

  const openAllocation = (id: string, recName: string, current: string[]) => {
    setAllocationRecId(id);
    setAllocationRecName(recName);
    setAllocationUnits(current.length > 0 ? [...current] : [units[0]?.id].filter(Boolean) as string[]);
    setAllocationOpen(true);
  };

  const handleSaveAllocation = async () => {
    if (!allocationRecId || allocationUnits.length === 0) {
      return;
    }
    setIsSavingAllocation(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const ok = await updateReceptionistUnits(allocationRecId, allocationUnits);
      if (ok) {
        setSuccessMessage(
          `Unidades atualizadas para "${allocationRecName}". O recepcionista deve sair e entrar de novo na recepção para aplicar na sessão atual.`
        );
        setAllocationOpen(false);
      } else {
        setErrorMessage('Não foi possível atualizar as unidades.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Erro ao salvar alocação de unidades.');
    } finally {
      setIsSavingAllocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmittingReceptionist) {
      return;
    }

    setSuccessMessage('');
    setErrorMessage('');

    if (selectedUnitIds.length === 0) {
      setErrorMessage('Selecione ao menos uma unidade para o recepcionista.');
      return;
    }

    setIsSubmittingReceptionist(true);

    try {
      const success = await addReceptionist(name, username, password, selectedUnitIds);
      if (success) {
        setSuccessMessage(`Recepcionista "${name}" cadastrado com sucesso!`);
        setName('');
        setUsername('');
        setPassword('');
      } else {
        setErrorMessage('Erro: Nome de usuário já existe ou dados inválidos');
      }
    } catch (error) {
      console.error('Error adding receptionist:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao cadastrar recepcionista.');
    } finally {
      setIsSubmittingReceptionist(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingUnit) {
      return;
    }
    setSuccessMessage('');
    setErrorMessage('');
    setIsSubmittingUnit(true);
    try {
      const slug = newUnitSlug.trim().toLowerCase().replace(/\s+/g, '');
      const ok = await addUnit({
        slug,
        name: newUnitName.trim(),
        address: newUnitAddress.trim(),
      });
      if (ok) {
        setSuccessMessage(`Unidade "${newUnitName}" cadastrada.`);
        setNewUnitSlug('');
        setNewUnitName('');
        setNewUnitAddress('');
        await refreshUnits();
      } else {
        setErrorMessage('Não foi possível criar a unidade (slug duplicado ou inválido).');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao cadastrar unidade.');
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  const startEditUnit = (u: { id: string; name: string; address: string; slug: string }) => {
    setEditUnitId(u.id);
    setEditUnitName(u.name);
    setEditUnitAddress(u.address);
    setEditUnitSlug(u.slug);
  };

  const handleSaveUnit = async () => {
    if (!editUnitId) {
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    const ok = await updateUnitRecord(editUnitId, {
      name: editUnitName.trim(),
      address: editUnitAddress.trim(),
      slug: editUnitSlug.trim().toLowerCase().replace(/\s+/g, ''),
    });
    if (ok) {
      setSuccessMessage('Unidade atualizada.');
      setEditUnitId(null);
      await refreshUnits();
    } else {
      setErrorMessage('Erro ao atualizar unidade.');
    }
  };

  const handleDeleteUnit = async (id: string, unitName: string) => {
    if (confirm(`Remover a unidade "${unitName}"? Recepcionistas devem ser realocados antes.`)) {
      try {
        await removeUnit(id);
        setSuccessMessage(`Unidade "${unitName}" removida.`);
        await refreshUnits();
      } catch (err) {
        console.error(err);
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao remover unidade.');
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja remover o recepcionista "${name}"?`)) {
      try {
        await removeReceptionist(id);
        setSuccessMessage(`Recepcionista "${name}" removido com sucesso!`);
      } catch (error) {
        console.error('Error removing receptionist:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Erro ao remover recepcionista.');
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
          logoutAdmin().then(() => {
            navigate('/admin/login');
          });
        }, 2000);
      } else {
        setErrorMessage('Erro ao atualizar credenciais');
        setIsSubmittingAdmin(false);
      }
    } catch (error) {
      console.error('Error updating admin credentials:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao atualizar credenciais.');
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="CBTEA Logo" className="h-16" />
            <div>
              <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                <Shield className="w-10 h-10 text-purple-600" />
                Painel Administrativo
              </h1>
              <p className="text-gray-600 mt-2">Unidades, endereços, QR Codes e alocação de recepcionistas</p>
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
                <Building2 className="w-5 h-5 text-purple-600" />
                Nova Unidade
              </CardTitle>
              <CardDescription>
                O slug define a URL pública e o caminho do QR Code (ex.: /unidadebarra e /unidadebarra/qrcode).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUnit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unitSlug">Slug da URL (ex: unidadebarra)</Label>
                  <Input
                    id="unitSlug"
                    value={newUnitSlug}
                    onChange={(e) => setNewUnitSlug(e.target.value)}
                    placeholder="unidadebarra"
                    disabled={isSubmittingUnit}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitName">Nome da unidade</Label>
                  <Input
                    id="unitName"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="Unidade Barra"
                    disabled={isSubmittingUnit}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitAddress">Endereço completo</Label>
                  <Input
                    id="unitAddress"
                    value={newUnitAddress}
                    onChange={(e) => setNewUnitAddress(e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                    disabled={isSubmittingUnit}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmittingUnit}>
                  {isSubmittingUnit ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Cadastrar unidade'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unidades cadastradas</CardTitle>
              <CardDescription>Links de check-in e QR por unidade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[28rem] overflow-y-auto">
              {units.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma unidade.</p>
              ) : (
                units.map((u) => (
                  <div key={u.id} className="border rounded-lg p-3 space-y-2">
                    {editUnitId === u.id ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Slug (URL)</Label>
                          <Input value={editUnitSlug} onChange={(e) => setEditUnitSlug(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input value={editUnitName} onChange={(e) => setEditUnitName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Endereço</Label>
                          <Input value={editUnitAddress} onChange={(e) => setEditUnitAddress(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" type="button" onClick={handleSaveUnit}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" type="button" onClick={() => setEditUnitId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-xs text-gray-600 mt-1 break-words">{u.address}</p>
                            <p className="text-xs font-mono text-purple-700 mt-2">
                              Check-in: /{u.slug} · QR: /{u.slug}/qrcode
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button size="sm" variant="outline" type="button" onClick={() => startEditUnit(u)}>
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              type="button"
                              onClick={() => handleDeleteUnit(u.id, u.name)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

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

                <div className="space-y-2">
                  <Label>Unidades que este recepcionista atende</Label>
                  <div className="space-y-2 border rounded-md p-3 max-h-44 overflow-y-auto bg-white">
                    {units.length === 0 ? (
                      <p className="text-xs text-gray-500">Cadastre uma unidade ao lado antes de adicionar recepcionistas.</p>
                    ) : (
                      units.map((u) => (
                        <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedUnitIds.includes(u.id)}
                            onCheckedChange={() => toggleNewRecUnit(u.id)}
                          />
                          <span>{u.name}</span>
                        </label>
                      ))
                    )}
                  </div>
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
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-lg">{receptionist.name}</p>
                      <p className="text-sm text-gray-600">@{receptionist.username}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Cadastrado em {new Date(receptionist.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(receptionist.unitIds || []).map((uid) => (
                          <Badge key={uid} variant="secondary" className="text-xs">
                            {units.find((x) => x.id === uid)?.name || uid}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        title="Alterar unidades"
                        onClick={() =>
                          openAllocation(receptionist.id, receptionist.name, receptionist.unitIds || [])
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        onClick={() => handleDelete(receptionist.id, receptionist.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
                  <p className="text-blue-800 font-semibold mb-1">Configuração Atual:</p>
                  <p className="text-blue-700">
                    Usuário: <span className="font-mono">{adminCredentials.username || 'não carregado'}</span>
                  </p>
                  <p className="text-blue-700">
                    Senha configurada:{' '}
                    <span className="font-mono">{adminCredentials.passwordConfigured ? 'sim' : 'não'}</span>
                  </p>
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
              <p>• Cadastre unidades com endereço; cada uma tem URL e QR próprios</p>
              <p>• Cada recepcionista deve ter ao menos uma unidade alocada — só verá fila e log dessas unidades</p>
              <p>• Os recepcionistas fazem login na área de recepção com as credenciais definidas aqui</p>
              <p>• O sistema registra qual recepcionista chamou cada paciente</p>
              <p className="pt-2 border-t mt-3 text-purple-700 font-semibold">• Mantenha as credenciais de admin seguras e atualizadas regularmente</p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={allocationOpen} onOpenChange={setAllocationOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unidades — {allocationRecName}</DialogTitle>
              <DialogDescription>
                Marque em quais unidades este usuário pode operar o painel da recepção e o log.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
              {units.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={allocationUnits.includes(u.id)}
                    onCheckedChange={() => toggleAllocationUnit(u.id)}
                  />
                  <span>{u.name}</span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAllocationOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveAllocation} disabled={isSavingAllocation}>
                {isSavingAllocation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function AdminPanelV2() {
  return (
    <ProtectedRoute role="admin">
      <AdminPanelContent />
    </ProtectedRoute>
  );
}
