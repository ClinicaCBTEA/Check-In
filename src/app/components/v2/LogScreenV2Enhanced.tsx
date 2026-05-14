import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useSimpleQueue } from '../../context/SimpleQueueContext';
import { useAuth } from '../../context/AuthContext';
import { useUserManagement } from '../../context/UserManagementContext';
import { ArrowLeft, Clock, Bell, Phone, Download, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router';
import ProtectedRoute from './ProtectedRoute';
import logo from '../../../imports/image.png';

function LogScreenEnhancedContent() {
  const { getLogEntries } = useSimpleQueue();
  const { receptionist } = useAuth();
  const { units } = useUserManagement();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [selectedUnitId, setSelectedUnitId] = useState('');

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

  const allEntries = getLogEntries();
  const filteredEntries = allEntries.filter((entry) => {
    const entryDate = entry.checkInTime.toISOString().split('T')[0];
    if (entryDate !== selectedDate) {
      return false;
    }

    if (!selectedUnitId) {
      return true;
    }

    return entry.unitId === selectedUnitId;
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const exportToExcel = async () => {
    const XLSX = await import('xlsx');
    const dataForExcel = filteredEntries.map((entry) => {
      const callHistory = entry.callHistory || [];

      const baseData: Record<string, string | number> = {
        Paciente: entry.patientName,
        Telefone: entry.phone,
        Unidade: unitLabel(entry.unitId || 'unidadebarra'),
        'Data Check-in': formatDate(entry.checkInTime),
        'Hora Check-in': formatTime(entry.checkInTime),
        'Total de Chamadas': callHistory.length,
        'Foi Devolvido': callHistory.some((call) => call.returnedTime) ? 'Sim' : 'Nao',
        Status:
          entry.status === 'in-service'
            ? 'Em Atendimento'
            : entry.status === 'completed'
              ? 'Concluido'
              : 'Aguardando',
      };

      callHistory.forEach((call, index) => {
        baseData[`Chamada ${index + 1} - Hora`] = formatTime(call.calledTime);
        baseData[`Chamada ${index + 1} - Recepcionista`] = call.calledBy;
        baseData[`Chamada ${index + 1} - Devolvido em`] = call.returnedTime
          ? formatTime(call.returnedTime)
          : '-';
      });

      return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Atendimentos');

    const colWidths = [
      { wch: 25 },
      { wch: 15 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
    ];

    const maxCalls = Math.max(...filteredEntries.map((entry) => (entry.callHistory || []).length), 0);
    for (let index = 0; index < maxCalls; index += 1) {
      colWidths.push({ wch: 15 });
      colWidths.push({ wch: 20 });
      colWidths.push({ wch: 15 });
    }

    worksheet['!cols'] = colWidths;
    XLSX.writeFile(workbook, `atendimentos_${selectedDate}_${selectedUnitId || 'todas'}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/recepcao')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={logo} alt="CBTEA Logo" className="h-14" />
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-800">Log de Atendimentos</h1>
            <p className="text-gray-600 mt-1">Registro filtrado por data e unidade operacional</p>
          </div>
          <Button onClick={exportToExcel} disabled={filteredEntries.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione a data e a unidade para visualizar os atendimentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1 max-w-xs">
                <Label htmlFor="date">Data</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    setSelectedDate(yesterday.toISOString().split('T')[0]);
                  }}
                >
                  Ontem
                </Button>
              </div>
            </div>

            {allowedUnits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allowedUnits.map((unit) => (
                  <Button
                    key={unit.id}
                    type="button"
                    variant={selectedUnitId === unit.id ? 'default' : 'outline'}
                    onClick={() => setSelectedUnitId(unit.id)}
                  >
                    {unit.name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Registros</CardDescription>
              <CardTitle className="text-3xl">{filteredEntries.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Aguardando</CardDescription>
              <CardTitle className="text-3xl">
                {filteredEntries.filter((entry) => entry.status === 'waiting').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Em Atendimento</CardDescription>
              <CardTitle className="text-3xl">
                {filteredEntries.filter((entry) => entry.status === 'in-service').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Concluídos</CardDescription>
              <CardTitle className="text-3xl">
                {filteredEntries.filter((entry) => entry.status === 'completed').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Histórico do Dia: {formatDate(new Date(selectedDate))}
              {selectedUnitId ? ` • ${unitLabel(selectedUnitId)}` : ''}
            </CardTitle>
            <CardDescription>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Nenhum registro encontrado para este filtro</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{entry.patientName}</h3>
                          <Badge variant="outline" className="text-xs">
                            {unitLabel(entry.unitId || 'unidadebarra')}
                          </Badge>
                          <Badge variant={entry.status === 'waiting' ? 'secondary' : 'default'}>
                            {entry.status === 'in-service'
                              ? 'Em Atendimento'
                              : entry.status === 'completed'
                                ? 'Concluído'
                                : 'Aguardando'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <Phone className="w-4 h-4" />
                          <span>{entry.phone}</span>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                          <div className="flex items-center gap-2 text-blue-700 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs font-medium">CHECK-IN</span>
                          </div>
                          <p className="text-sm font-semibold text-blue-900">{formatDate(entry.checkInTime)}</p>
                          <p className="text-lg font-bold text-blue-900">{formatTime(entry.checkInTime)}</p>
                        </div>

                        {entry.callHistory && entry.callHistory.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-700 uppercase">Histórico de Chamadas:</p>
                            {entry.callHistory.map((call, index) => (
                              <div key={index} className="border-l-4 border-green-500 bg-green-50 rounded p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2 text-green-700">
                                    <Bell className="w-4 h-4" />
                                    <span className="text-xs font-medium">CHAMADA #{index + 1}</span>
                                  </div>
                                  {call.returnedTime && (
                                    <Badge variant="secondary" className="text-xs">
                                      Devolvido
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <p className="text-xs text-green-700">Chamado em:</p>
                                    <p className="font-bold text-green-900">{formatTime(call.calledTime)}</p>
                                  </div>
                                  {call.returnedTime && (
                                    <div>
                                      <p className="text-xs text-orange-700">Devolvido em:</p>
                                      <p className="font-bold text-orange-900">{formatTime(call.returnedTime)}</p>
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-green-700 mt-2">
                                  Chamado por: <span className="font-semibold">{call.calledBy}</span>
                                </p>
                                {call.returnedTime && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Tempo em atendimento:{' '}
                                    {Math.round(
                                      (call.returnedTime.getTime() - call.calledTime.getTime()) / 60000,
                                    )}{' '}
                                    min
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 rounded p-3 mt-3">
                            <p className="text-sm text-gray-500 italic text-center">Aguardando primeira chamada</p>
                          </div>
                        )}

                        {entry.callHistory && entry.callHistory.length > 0 && (
                          <div className="mt-3 bg-purple-50 border border-purple-200 rounded p-2">
                            <p className="text-xs text-purple-700">
                              <strong>Resumo:</strong> {entry.callHistory.length}{' '}
                              {entry.callHistory.length === 1 ? 'chamada' : 'chamadas'}
                              {entry.callHistory.some((call) => call.returnedTime) && ' • Paciente foi devolvido à fila'}
                              {entry.status === 'in-service' && ' • Atualmente em atendimento'}
                              {entry.status === 'completed' && ' • Atendimento concluído'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LogScreenV2Enhanced() {
  return (
    <ProtectedRoute role="reception">
      <LogScreenEnhancedContent />
    </ProtectedRoute>
  );
}
