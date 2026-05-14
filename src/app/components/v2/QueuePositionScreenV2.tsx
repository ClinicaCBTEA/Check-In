import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '../ui/button';
import * as api from '../../../utils/api';
import {
  Bell,
  BellRing,
  CheckCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import {
  isNotificationSupported,
  playNotificationSound,
  requestNotificationPermission,
  showNotification,
} from '../../../utils/notifications';
import logo from '../../../imports/image.png';

const TRACKING_STORAGE_KEY = 'cbtea_patient_tracking';

interface TrackingSession {
  patientId: string;
  accessToken: string;
  unitId: string;
  unitSlug: string;
}

function loadTrackingSession(): TrackingSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(TRACKING_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as TrackingSession;
    if (!parsed?.patientId || !parsed?.accessToken || !parsed?.unitId || !parsed?.unitSlug) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function storeTrackingSession(session: TrackingSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    localStorage.removeItem(TRACKING_STORAGE_KEY);
    return;
  }

  localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(session));
}

export default function QueuePositionScreenV2() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tracking, setTracking] = useState<TrackingSession | null>(null);
  const [status, setStatus] = useState<api.PatientTrackingDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    const patientId = location.state?.patientId as string | undefined;
    const accessToken = location.state?.accessToken as string | undefined;
    const unitId = location.state?.unitId as string | undefined;
    const unitSlug = location.state?.unitSlug as string | undefined;

    if (patientId && accessToken && unitId && unitSlug) {
      const session = { patientId, accessToken, unitId, unitSlug };
      setTracking(session);
      storeTrackingSession(session);
      return;
    }

    const storedSession = loadTrackingSession();
    if (storedSession) {
      setTracking(storedSession);
      return;
    }

    navigate('/');
  }, [location.state, navigate]);

  useEffect(() => {
    if (!isNotificationSupported()) {
      return;
    }

    requestNotificationPermission().then((permission) => {
      setNotificationPermission(permission);
    });
  }, []);

  useEffect(() => {
    if (!tracking) {
      return;
    }

    let cancelled = false;

    const refreshStatus = async () => {
      try {
        const nextStatus = await api.fetchPatientStatus(tracking.patientId, tracking.accessToken);
        if (!cancelled) {
          setStatus(nextStatus);
          setErrorMessage('');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching patient status:', error);
        if (!cancelled) {
          setErrorMessage('Não foi possível atualizar sua posição agora. Tentaremos novamente automaticamente.');
          setIsLoading(false);
        }
      }
    };

    refreshStatus();
    const interval = window.setInterval(refreshStatus, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [tracking]);

  useEffect(() => {
    const currentStatus = status?.status || null;

    if (
      currentStatus === 'in-service' &&
      previousStatusRef.current &&
      previousStatusRef.current !== 'in-service'
    ) {
      playNotificationSound();

      if (notificationPermission === 'granted') {
        showNotification('É a sua vez!', {
          body: 'Por favor, dirija-se ao atendimento agora.',
          icon: logo,
          badge: logo,
          tag: 'queue-notification',
          requireInteraction: true,
          vibrate: [200, 100, 200],
        });
      }

      if (document.hidden) {
        const originalTitle = document.title;
        let isOriginal = true;
        const titleBlinkInterval = window.setInterval(() => {
          document.title = isOriginal ? 'É SUA VEZ!' : originalTitle;
          isOriginal = !isOriginal;
        }, 1000);

        const handleVisibilityChange = () => {
          if (!document.hidden) {
            window.clearInterval(titleBlinkInterval);
            document.title = originalTitle;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
      }
    }

    previousStatusRef.current = currentStatus;
  }, [notificationPermission, status?.status]);

  const isInService = status?.status === 'in-service';
  const isCompleted = status?.status === 'completed';
  const position = status?.position ?? null;
  const totalWaiting = status?.totalWaiting ?? 0;

  const handleReturnToQueue = async () => {
    if (!tracking) {
      return;
    }

    setIsReturning(true);
    try {
      await api.rejoinPatientQueue(tracking.patientId, tracking.accessToken);
      const nextStatus = await api.fetchPatientStatus(tracking.patientId, tracking.accessToken);
      setStatus(nextStatus);
      setErrorMessage('');
    } catch (error) {
      console.error('Error returning to queue:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao retornar para a fila.');
    } finally {
      setIsReturning(false);
    }
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const backPath = useMemo(() => {
    return tracking?.unitSlug ? `/${tracking.unitSlug}` : '/';
  }, [tracking?.unitSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="bg-white shadow-sm border-b py-3 sm:py-4 px-4">
        <div className="max-w-2xl mx-auto flex justify-center">
          <img src={logo} alt="CBTEA Logo" className="h-10 sm:h-12" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {errorMessage}
            </div>
          )}

          {isCompleted ? (
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-12 text-center border-4 sm:border-8 border-blue-500">
              <div className="bg-blue-100 rounded-full w-20 h-20 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 sm:w-20 sm:h-20 text-blue-600" />
              </div>
              <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-blue-700 mb-3 sm:mb-4 leading-tight">Atendimento Concluído!</p>
              <p className="text-lg sm:text-xl md:text-2xl text-blue-600 font-semibold mb-4 sm:mb-6">Obrigado pela visita</p>
              <div className="mt-4 sm:mt-8 bg-blue-50 rounded-xl p-4 sm:p-6">
                <p className="text-base sm:text-lg text-blue-800 mb-3 sm:mb-4">Seu atendimento foi finalizado com sucesso.</p>
                <p className="text-sm text-blue-700 mb-4 sm:mb-6">Se precisar retornar, você pode entrar novamente na fila pelo botão abaixo.</p>
                <Button onClick={handleReturnToQueue} disabled={isReturning} size="lg" className="w-full sm:max-w-xs">
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
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 sm:py-6 px-4 sm:px-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-center">Fila de Atendimento</h1>
              </div>

              <div className="p-6 sm:p-12">
                <div className="text-center mb-6 sm:mb-8">
                  <p className="text-lg sm:text-2xl text-gray-600 mb-3 sm:mb-4">Sua posição:</p>
                  <div className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-full w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto flex items-center justify-center shadow-xl">
                    <p className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white drop-shadow-lg">
                      {position ?? '-'}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-4 sm:p-6 text-center border-2 border-emerald-200">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 flex-wrap">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700" />
                    <p className="text-base sm:text-lg md:text-xl font-semibold text-emerald-900">
                      {totalWaiting} {totalWaiting === 1 ? 'pessoa' : 'pessoas'} aguardando nesta unidade
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-700">Aguardando atendimento</p>
                </div>

                <div className="mt-6 sm:mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6 text-center">
                  <Bell className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-blue-600" />
                  <p className="text-base sm:text-lg font-semibold text-blue-900 mb-1">Fique atento!</p>
                  <p className="text-sm sm:text-base text-blue-700">Você será avisado nesta tela quando chegar sua vez.</p>
                </div>

                {isNotificationSupported() && (
                  <div className="mt-4 sm:mt-6">
                    {notificationPermission === 'granted' ? (
                      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 sm:p-4 flex items-center justify-center gap-2">
                        <BellRing className="w-5 h-5 text-green-600" />
                        <p className="text-xs sm:text-sm text-green-800 font-medium">Notificações habilitadas</p>
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

          <div className="mt-4 sm:mt-6 text-center">
            <Button
              variant="outline"
              size="lg"
              className="bg-white text-sm sm:text-base"
              onClick={() => navigate(backPath)}
            >
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
