import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { projectId, publishableKey } from '/utils/supabase/info';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkConnection();

    // Check connection every 10 seconds
    const interval = setInterval(checkConnection, 10000);

    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/health`,
        {
          method: 'GET',
          headers: {
            'apikey': publishableKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const isOk = data.status === 'ok';
        setIsConnected(isOk);

        // Check server version
        if (isOk && data.version) {
          console.log(`Server version: ${data.version}`);
          if (data.version !== '2.0') {
            console.warn('⚠️ Server version mismatch! Please re-deploy the Edge Function.');
          }
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
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
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl px-4">
        <Alert className="shadow-lg bg-amber-50 border-amber-300">
          <WifiOff className="h-5 w-5 text-amber-600" />
          <AlertDescription className="ml-2">
            <div className="space-y-2 text-amber-900">
              <p className="font-semibold">⚠️ Modo Local - Sem Sincronização</p>
              <p className="text-sm">
                O servidor Supabase não está disponível. A aplicação funciona em <strong>modo local</strong> (dados não são compartilhados entre dispositivos).
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Como habilitar sincronização em tempo real?</summary>
                <ol className="list-decimal list-inside space-y-1 ml-2 mt-2">
                  <li>Abra as <strong>Configurações do Make</strong> (ícone ⚙️)</li>
                  <li>Procure pela seção <strong>Supabase</strong></li>
                  <li>Clique em <strong>Deploy Edge Function</strong></li>
                </ol>
                <p className="text-xs mt-2 opacity-80">
                  Ou acesse: <code className="bg-amber-100 px-1 rounded text-xs">https://supabase.com/dashboard/project/{projectId}/functions</code>
                </p>
              </details>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isConnected === true) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
          <Wifi className="h-4 w-4" />
          <span>Conectado</span>
        </div>
      </div>
    );
  }

  return null;
}
