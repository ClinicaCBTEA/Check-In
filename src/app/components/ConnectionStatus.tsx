import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Wifi, WifiOff } from 'lucide-react';
import { projectId, publishableKey } from '/utils/supabase/info';

const IS_PROD = import.meta.env.PROD;
const CONNECTION_CHECK_INTERVAL_MS = IS_PROD ? 60000 : 15000;

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const checkConnection = async () => {
      if (isCheckingRef.current || document.hidden) {
        return;
      }

      isCheckingRef.current = true;

      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/server/health`,
          {
            method: 'GET',
            headers: {
              apikey: publishableKey,
            },
          }
        );

        if (!mounted) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const isOk = data.status === 'ok';
          setIsConnected(isOk);

          if (!IS_PROD && isOk && data.version && data.version !== '3.0') {
            console.warn('Server version mismatch. Please redeploy the Edge Function.');
          }
        } else {
          setIsConnected(false);
        }
      } catch {
        if (!mounted) {
          return;
        }

        setIsConnected(false);
      } finally {
        if (mounted) {
          setIsChecking(false);
        }

        isCheckingRef.current = false;
      }
    };

    const handleOnline = () => {
      void checkConnection();
    };

    const handleOffline = () => {
      setIsConnected(false);
      setIsChecking(false);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void checkConnection();
      }
    };

    void checkConnection();

    const interval = window.setInterval(() => {
      void checkConnection();
    }, CONNECTION_CHECK_INTERVAL_MS);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (isChecking) {
    return null;
  }

  if (isConnected === false) {
    return (
      <div className="fixed top-4 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 transform px-4">
        <Alert className="border-amber-300 bg-amber-50 shadow-lg">
          <WifiOff className="h-5 w-5 text-amber-600" />
          <AlertDescription className="ml-2 text-amber-900">
            {IS_PROD ? (
              <p className="text-sm font-medium">
                Não foi possível conectar ao servidor. Verifique sua internet e tente novamente em instantes.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Sincronização temporariamente indisponível</p>
                <p>
                  O servidor do check-in não respondeu. Em desenvolvimento você pode validar a função{' '}
                  <span className="font-mono">server</span> antes de testar o fluxo completo.
                </p>
                <p className="text-xs opacity-80">
                  Projeto: <span className="font-mono">{projectId}</span> — publique a Edge Function e teste{' '}
                  <span className="font-mono">/functions/v1/server/health</span>.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isConnected === true && !IS_PROD) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <Wifi className="w-4 h-4" />
          <span>Conectado</span>
        </div>
      </div>
    );
  }

  return null;
}
