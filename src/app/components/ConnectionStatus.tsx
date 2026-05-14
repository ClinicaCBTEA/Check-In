import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Wifi, WifiOff } from 'lucide-react';
import { projectId, publishableKey } from '/utils/supabase/info';

const IS_PROD = import.meta.env.PROD;

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkConnection();

    const interval = setInterval(checkConnection, 15000);

    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
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
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

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
