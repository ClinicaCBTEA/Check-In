import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useSimpleQueue } from '../context/SimpleQueueContext';
import { Bug, QrCode, UserCircle, Users, Bell, Monitor, UserPlus, LayoutDashboard } from 'lucide-react';

export default function DebugMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { queue, currentPatient, addToQueue, callNext } = useSimpleQueue();
  const [open, setOpen] = useState(false);

  // Ocultar debug menu na versão publicada
  const isPublished = typeof window !== 'undefined' && window.location.hostname.includes('figma.site');

  const waitingPatients = queue.filter(p => p.status === 'waiting');

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const addMockPatient = async () => {
    const mockNames = [
      'João Silva',
      'Maria Santos',
      'Pedro Oliveira',
      'Ana Costa',
      'Carlos Souza',
      'Juliana Pereira'
    ];
    const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
    const randomPhone = `(${Math.floor(Math.random() * 90 + 10)}) ${Math.floor(Math.random() * 90000 + 10000)}-${Math.floor(Math.random() * 9000 + 1000)}`;

    try {
      await addToQueue(randomName, randomPhone);
    } catch (error) {
      console.error('Error adding mock patient:', error);
    }
  };

  const callNextPatient = async () => {
    try {
      await callNext('Debug User');
    } catch (error) {
      console.error('Error calling next patient:', error);
    }
  };

  const currentPath = location.pathname;

  // Não renderizar na versão publicada
  if (isPublished) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700 text-white border-none"
        >
          <Bug className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu de Debug</SheetTitle>
          <SheetDescription>
            Ferramentas de teste e navegação
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tela Atual */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Tela Atual
            </h3>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm font-mono text-purple-800">{currentPath}</p>
            </div>
          </div>

          <Separator />

          {/* Navegação */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Navegação Rápida
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastro
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/qrcode')}>
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/fila')}>
                <Users className="w-4 h-4 mr-2" />
                Fila
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/login')}>
                <UserCircle className="w-4 h-4 mr-2" />
                Login
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/recepcao')}>
                <Bell className="w-4 h-4 mr-2" />
                Recepção
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/log')}>
                <Monitor className="w-4 h-4 mr-2" />
                Log
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/admin/login')}>
                <UserCircle className="w-4 h-4 mr-2" />
                Admin Login
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('/admin')}>
                <Users className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>

          <Separator />

          {/* Status da Fila */}
          <div>
            <h3 className="font-semibold mb-3">Status da Fila</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">Total na Fila</span>
                <Badge variant="default">{queue.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium">Aguardando</span>
                <Badge variant="secondary">{waitingPatients.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Paciente Atual</span>
                <Badge variant={currentPatient ? 'default' : 'outline'}>
                  {currentPatient ? currentPatient.patientName : 'Nenhum'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ações Rápidas */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Ações de Teste
            </h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={addMockPatient}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Adicionar Paciente Mock
              </Button>
              <Button
                variant="default"
                size="sm"
                className="w-full justify-start"
                onClick={callNextPatient}
                disabled={waitingPatients.length === 0}
              >
                <Bell className="w-4 h-4 mr-2" />
                Chamar Próximo Paciente
              </Button>
            </div>
          </div>

          <Separator />

          {/* Lista da Fila */}
          {waitingPatients.length > 0 && (
            <>
              <div>
                <h3 className="font-semibold mb-3">Pacientes Aguardando</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {waitingPatients.map((patient, index) => (
                    <div key={patient.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{patient.patientName}</p>
                        <p className="text-xs text-gray-500">{patient.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Informações */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-xs text-purple-800">
              <strong>Dica:</strong> Este menu é apenas para debug e testes. Não aparecerá na versão final.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
