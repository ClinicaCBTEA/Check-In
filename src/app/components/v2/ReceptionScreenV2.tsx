import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useSimpleQueue } from '../../context/SimpleQueueContext';
import { useAuth } from '../../context/AuthContext';
import { useUserManagement } from '../../context/UserManagementContext';
import {
  Bell,
  Clock,
  Users,
  Phone,
  ChevronUp,
  LogOut,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import ProtectedRoute from './ProtectedRoute';
import logo from '../../../imports/image.png';

function ReceptionScreenContent() {
  const { queue, callNext, callSpecificPatient, completeService, returnToQueue, moveToFront } = useSimpleQueue();
  const { logoutReceptionist, currentUser, receptionist } = useAuth();
  const { units } = useUserManagement();
  const navigate = useNavigate();
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const allowedUnits = useMemo(() => {
    if (!receptionist?.unitIds?.length) {
      return [];
    }

    return units.filter((unit) => receptionist.unitIds.includes(unit.id));
  }, [receptionist?.unitIds, units]);

  useEffect(() => {
    if (!selectedUnitId && allowedUnits.length > 0) {
      setSelectedUnitId(allowedUnits[0].id);
    }
  }, [allowedUnits, selectedUnitId]);

  const unitLabel = (id: string) => units.find((unit) => unit.id === id)?.name || id;

  const handleLogout = async () => {
    await logoutReceptionist();
    navigate('/login');
  };

  const handleCallNext = async () => {
    if (!currentUser || !selectedUnitId) {
      return;
    }

    setErrorMessage('');
    try {
      await callNext(currentUser, selectedUnitId);
    } catch (error) {
      console.error('Error calling next patient:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao chamar próximo paciente.');
    }
  };

  const handleCallSpecific = async (patientId: string) => {
    if (!currentUser) {
      return;
    }

    setErrorMessage('');
    try {
      await callSpecificPatient(patientId, currentUser);
    } catch (error) {
      console.error('Error calling specific patient:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao chamar paciente.');
    }
  };

  const waitingPatients = queue.filter(
    (patient) => patient.status === 'waiting' && patient.unitId === selectedUnitId,
  );
  const inServicePatients = queue.filter(
    (patient) => patient.status === 'in-service' && patient.unitId === selectedUnitId,
  );
  const completedPatients = queue.filter(
    (patient) => patient.status === 'completed' && patient.unitId === selectedUnitId,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="CBTEA Logo" className="h-16" />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Painel da Recepção</h1>
              <p className="text-gray-600 mt-2">Gerenciamento de chamadas por unidade</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/log')}>
              Ver Log de Atendimentos
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>

        {allowedUnits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Unidade em Operação</CardTitle>
              <CardDescription>
                Selecione a unidade que deseja operar agora. As chamadas e a fila abaixo seguem esta seleção.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {allowedUnits.map((unit) => (
                <Button
                  key={unit.id}
                  type="button"
                  variant={selectedUnitId === unit.id ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedUnitId(unit.id);
                    setErrorMessage('');
                  }}
                >
                  {unit.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Aguardando</CardDescription>
              <CardTitle className="text-3xl">{waitingPatients.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Na fila da unidade selecionada</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Em Atendimento</CardDescription>
              <CardTitle className="text-3xl">{inServicePatients.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Bell className="w-4 h-4" />
                <span>Atendimento atual</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Concluídos</CardDescription>
              <CardTitle className="text-3xl">{completedPatients.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4" />
                <span>Finalizados</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Unidade</CardDescription>
              <CardTitle className="text-xl">{selectedUnitId ? unitLabel(selectedUnitId) : '-'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>Escopo atual da operação</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Pacientes em Atendimento</CardTitle>
            <CardDescription>{inServicePatients.length} paciente(s) em atendimento nesta unidade</CardDescription>
          </CardHeader>
          <CardContent>
            {inServicePatients.length > 0 ? (
              <div className="space-y-3">
                {inServicePatients.map((patient) => (
                  <div key={patient.id} className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xl font-bold text-green-800">{patient.patientName}</p>
                        <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
                          <Phone className="w-3 h-3" />
                          <p>{patient.phone}</p>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Chamado por {patient.calledBy} às {patient.calledTime?.toLocaleTimeString('pt-BR')}
                        </p>
                        <p className="text-xs text-green-700 mt-1">Unidade: {unitLabel(patient.unitId)}</p>
                      </div>
                      <Badge className="bg-green-600">Atendendo</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          setErrorMessage('');
                          try {
                            await completeService(patient.id);
                          } catch (error) {
                            console.error('Error completing service:', error);
                            setErrorMessage(error instanceof Error ? error.message : 'Erro ao concluir atendimento.');
                          }
                        }}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Concluir Atendimento
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          setErrorMessage('');
                          try {
                            await returnToQueue(patient.id);
                          } catch (error) {
                            console.error('Error returning patient to queue:', error);
                            setErrorMessage(
                              error instanceof Error ? error.message : 'Erro ao devolver paciente para fila.',
                            );
                          }
                        }}
                        className="flex-1"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Devolver à Fila
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 text-center">
                <p className="text-gray-500">Nenhum paciente em atendimento nesta unidade</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Chamar Próximo</CardTitle>
              <CardDescription>Próximo paciente da fila da unidade selecionada</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {waitingPatients.length > 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-2">Próximo da Fila:</p>
                  <p className="text-xl font-semibold text-blue-800">{waitingPatients[0].patientName}</p>
                  <div className="flex items-center gap-2 text-blue-600 text-sm mt-1">
                    <Phone className="w-3 h-3" />
                    <p>{waitingPatients[0].phone}</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Check-in: {waitingPatients[0].checkInTime.toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">Nenhum paciente na fila desta unidade</div>
              )}

              <Button
                onClick={handleCallNext}
                size="lg"
                className="w-full"
                disabled={waitingPatients.length === 0 || !selectedUnitId}
              >
                <Bell className="w-5 h-5 mr-2" />
                Chamar Próximo Paciente
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Fila de Espera</CardTitle>
              <CardDescription>{waitingPatients.length} pacientes aguardando nesta unidade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {waitingPatients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Fila vazia</div>
                ) : (
                  waitingPatients.map((patient, index) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{patient.patientName}</p>
                          <p className="text-xs text-gray-500">{patient.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setErrorMessage('');
                              try {
                                await moveToFront(patient.id);
                              } catch (error) {
                                console.error('Error moving patient to front:', error);
                                setErrorMessage(error instanceof Error ? error.message : 'Erro ao mover paciente.');
                              }
                            }}
                            title="Mover para o início da fila"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" onClick={() => handleCallSpecific(patient.id)} title="Chamar este paciente agora">
                          <Bell className="w-4 h-4 mr-1" />
                          Chamar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReceptionScreenV2() {
  return (
    <ProtectedRoute role="reception">
      <ReceptionScreenContent />
    </ProtectedRoute>
  );
}
