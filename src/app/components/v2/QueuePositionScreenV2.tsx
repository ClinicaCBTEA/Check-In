import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useSimpleQueue } from '../../context/SimpleQueueContext';
import { Clock, Users, Bell, CheckCircle, RotateCcw, BellRing } from 'lucide-react';
import { requestNotificationPermission, showNotification, playNotificationSound, isNotificationSupported, getNotificationPermission } from '../../../utils/notifications';

export default function QueuePositionScreenV2() {
  const location = useLocation();
  const navigate = useNavigate();
  const { queue, getPatientPosition, returnToQueue } = useSimpleQueue();
  const [patientId, setPatientId] = useState<string>('');
  const [position, setPosition] = useState<number | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const id = location.state?.patientId;
    if (id) {
      setPatientId(id);
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  // Request notification permission on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      requestNotificationPermission().then(permission => {
        setNotificationPermission(permission);
        if (permission === 'granted') {
          console.log('Notification permission granted');
        } else if (permission === 'denied') {
          console.log('Notification permission denied');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (patientId) {
      const pos = getPatientPosition(patientId);
      setPosition(pos);
    }
  }, [patientId, queue, getPatientPosition]);

  // Detect status change and trigger notification
  useEffect(() => {
    if (!patientId) return;

    const currentPatientData = queue.find(p => p.id === patientId);
    if (!currentPatientData) return;

    const currentStatus = currentPatientData.status;

    // Check if status changed to 'in-service'
    if (previousStatusRef.current && previousStatusRef.current !== 'in-service' && currentStatus === 'in-service') {
      // Trigger notification
      playNotificationSound();

      if (notificationPermission === 'granted') {
        showNotification('🔔 É a sua vez!', {
          body: 'Por favor, dirija-se ao atendimento agora.',
          icon: '/src/imports/image.png',
          badge: '/src/imports/image.png',
          tag: 'queue-notification',
          requireInteraction: true,
          vibrate: [200, 100, 200],
        });
      }

      // Make tab title blink if user is on another tab
      if (document.hidden) {
        let titleBlinkInterval: NodeJS.Timeout;
        const originalTitle = document.title;
        let isOriginal = true;

        titleBlinkInterval = setInterval(() => {
          document.title = isOriginal ? '🔔 É SUA VEZ!' : originalTitle;
          isOriginal = !isOriginal;
        }, 1000);

        // Stop blinking when user returns to tab
        const handleVisibilityChange = () => {
          if (!document.hidden) {
            clearInterval(titleBlinkInterval);
            document.title = originalTitle;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    }

    // Update previous status
    previousStatusRef.current = currentStatus;
  }, [patientId, queue, notificationPermission]);

  const currentPatientData = queue.find(p => p.id === patientId);
  const waitingPatients = queue.filter(p => p.status === 'waiting');
  const isInService = currentPatientData?.status === 'in-service';
  const isCompleted = currentPatientData?.status === 'completed';

  const handleReturnToQueue = async () => {
    if (!patientId) return;

    setIsReturning(true);
    try {
      await returnToQueue(patientId);
    } catch (error) {
      console.error('Error returning to queue:', error);
      alert('Erro ao retornar para a fila. Tente novamente.');
    } finally {
      setIsReturning(false);
    }
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);

    if (permission === 'granted') {
      alert('Notificações habilitadas! Você será avisado quando for sua vez.');
    } else if (permission === 'denied') {
      alert('Permissão negada. Para habilitar notificações, vá nas configurações do navegador.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header com Logo */}
      <div className="bg-white shadow-sm border-b py-3 sm:py-4 px-4">
        <div className="max-w-2xl mx-auto flex justify-center">
          <img src="/src/imports/image.png" alt="CBTEA Logo" className="h-10 sm:h-12" />
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {isCompleted ? (
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-12 text-center border-4 sm:border-8 border-blue-500">
              <div className="bg-blue-100 rounded-full w-20 h-20 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 sm:w-20 sm:h-20 text-blue-600" />
              </div>
              <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-blue-700 mb-3 sm:mb-4 leading-tight">Atendimento Concluído!</p>
              <p className="text-lg sm:text-xl md:text-2xl text-blue-600 font-semibold mb-4 sm:mb-6">Obrigado pela visita</p>
              <div className="mt-4 sm:mt-8 bg-blue-50 rounded-xl p-4 sm:p-6">
                <p className="text-base sm:text-lg text-blue-800 mb-3 sm:mb-4">Seu atendimento foi finalizado com sucesso.</p>
                <p className="text-sm text-blue-700 mb-4 sm:mb-6">Caso precise retornar ao atendimento, clique no botão abaixo para voltar à fila.</p>
                <Button
                  onClick={handleReturnToQueue}
                  disabled={isReturning}
                  size="lg"
                  className="w-full sm:max-w-xs"
                >
                  {isReturning ? (
                    <>
                      <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                      <span className="text-sm sm:text-base">Voltando...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5 mr-2" />
                      <span className="text-sm sm:text-base">Voltar para a Fila</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : isInService ? (
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-12 text-center animate-pulse border-4 sm:border-8 border-green-500">
              <div className="bg-green-100 rounded-full w-20 h-20 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <Bell className="w-12 h-12 sm:w-20 sm:h-20 text-green-600" />
              </div>
              <p className="text-4xl sm:text-5xl md:text-6xl font-black text-green-700 mb-3 sm:mb-4 leading-tight">É a sua vez!</p>
              <p className="text-lg sm:text-xl md:text-2xl text-green-600 font-semibold">Dirija-se ao atendimento</p>
              <div className="mt-4 sm:mt-8 bg-green-50 rounded-xl p-3 sm:p-4">
                <p className="text-base sm:text-lg text-green-800">Por favor, apresente-se na recepção</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Header do Card */}
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 sm:py-6 px-4 sm:px-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-center">Fila de Atendimento</h1>
              </div>

              {/* Posição na Fila */}
              <div className="p-6 sm:p-12">
                <div className="text-center mb-6 sm:mb-8">
                  <p className="text-lg sm:text-2xl text-gray-600 mb-3 sm:mb-4">Sua posição:</p>
                  <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto flex items-center justify-center shadow-xl">
                    <p className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white drop-shadow-lg">
                      {position || '-'}
                    </p>
                  </div>
                </div>

                {/* Informação de Pessoas Aguardando */}
                <div className="bg-emerald-50 rounded-2xl p-4 sm:p-6 text-center border-2 border-emerald-200">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 flex-wrap">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                    <p className="text-base sm:text-lg md:text-xl font-semibold text-emerald-900">
                      {waitingPatients.length} {waitingPatients.length === 1 ? 'pessoa' : 'pessoas'} na fila
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-700">Aguardando atendimento</p>
                </div>

                {/* Aviso */}
                <div className="mt-6 sm:mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 text-center">
                  <Bell className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-blue-600" />
                  <p className="text-base sm:text-lg font-semibold text-blue-900 mb-1">Fique atento!</p>
                  <p className="text-sm sm:text-base text-blue-700">Você será chamado por esta tela quando chegar sua vez</p>
                </div>

                {/* Notification Status */}
                {isNotificationSupported() && (
                  <div className="mt-4 sm:mt-6">
                    {notificationPermission === 'granted' ? (
                      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 sm:p-4 flex items-center justify-center gap-2">
                        <BellRing className="w-5 h-5 text-green-600" />
                        <p className="text-xs sm:text-sm text-green-800 font-medium">Notificações habilitadas ✓</p>
                      </div>
                    ) : notificationPermission === 'denied' ? (
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3 sm:p-4 text-center">
                        <p className="text-xs sm:text-sm text-orange-800 mb-2">Notificações bloqueadas</p>
                        <p className="text-xs text-orange-700">Habilite nas configurações do navegador para receber avisos</p>
                      </div>
                    ) : (
                      <Button
                        onClick={handleEnableNotifications}
                        variant="outline"
                        className="w-full border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900"
                      >
                        <BellRing className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        <span className="text-sm sm:text-base">Habilitar Notificações</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão Voltar */}
          <div className="mt-4 sm:mt-6 text-center">
            <Button
              variant="outline"
              size="lg"
              className="bg-white text-sm sm:text-base"
              onClick={() => navigate('/')}
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
