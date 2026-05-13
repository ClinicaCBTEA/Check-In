import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useSimpleQueue } from '../../context/SimpleQueueContext';
import { useAuth } from '../../context/AuthContext';
import { Bell, Clock, Users, Phone, ChevronUp, LogOut, RotateCcw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import ProtectedRoute from './ProtectedRoute';

function ReceptionScreenContent() {
  const { queue, currentPatient, callNext, callSpecificPatient, completeService, returnToQueue, moveToFront } = useSimpleQueue();
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCallNext = async () => {
    if (currentUser) {
      try {
        await callNext(currentUser);
      } catch (error) {
        console.error('Error calling next patient:', error);
        alert('Erro ao chamar próximo paciente. Tente novamente.');
      }
    }
  };

  const handleCallSpecific = async (patientId: string) => {
    if (currentUser) {
      try {
        await callSpecificPatient(patientId, currentUser);
      } catch (error) {
        console.error('Error calling specific patient:', error);
        alert('Erro ao chamar paciente. Tente novamente.');
      }
    }
  };

  const waitingPatients = queue.filter(p => p.status === 'waiting');
  const inServicePatients = queue.filter(p => p.status === 'in-service');
  const completedPatients = queue.filter(p => p.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/src/imports/image.png" alt="CBTEA Logo" className="h-16" />
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Painel da Recepção</h1>
              <p className="text-gray-600 mt-2">Gerenciamento de chamadas</p>
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

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Aguardando</CardDescription>
              <CardTitle className="text-3xl">{waitingPatients.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Na fila</span>
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
                <span>Atendendo</span>
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
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-3xl">{queue.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>Hoje</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Pacientes em Atendimento</CardTitle>
            <CardDescription>{inServicePatients.length} paciente(s) sendo atendido(s)</CardDescription>
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
                      </div>
                      <Badge className="bg-green-600">Atendendo</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          try {
                            await completeService(patient.id);
                          } catch (error) {
                            console.error('Error completing service:', error);
                            alert('Erro ao concluir atendimento. Tente novamente.');
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
                          try {
                            await returnToQueue(patient.id);
                          } catch (error) {
                            console.error('Error returning patient to queue:', error);
                            alert('Erro ao devolver paciente para fila. Tente novamente.');
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
                <p className="text-gray-500">Nenhum paciente em atendimento</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Chamar Próximo</CardTitle>
              <CardDescription>Próximo paciente da fila</CardDescription>
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
                <div className="text-center py-4 text-gray-500">
                  Nenhum paciente na fila
                </div>
              )}

              <Button
                onClick={handleCallNext}
                size="lg"
                className="w-full"
                disabled={waitingPatients.length === 0}
              >
                <Bell className="w-5 h-5 mr-2" />
                Chamar Próximo Paciente
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Fila de Espera</CardTitle>
              <CardDescription>{waitingPatients.length} pacientes aguardando</CardDescription>
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
                              try {
                                await moveToFront(patient.id);
                              } catch (error) {
                                console.error('Error moving patient to front:', error);
                                alert('Erro ao mover paciente. Tente novamente.');
                              }
                            }}
                            title="Mover para o início da fila"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleCallSpecific(patient.id)}
                          title="Chamar este paciente agora"
                        >
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
    <ProtectedRoute>
      <ReceptionScreenContent />
    </ProtectedRoute>
  );
}
