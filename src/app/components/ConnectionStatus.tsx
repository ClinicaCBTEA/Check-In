import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Wifi, WifiOff } from 'lucide-react';
import { projectId, publishableKey } from '/utils/supabase/info';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const functionsDashboardUrl = `https://supabase.com/dashboard/project/${projectId}/functions`;
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;

  useEffect(() => {
    checkConnection();

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
            apikey: publishableKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const isOk = data.status === 'ok';
        setIsConnected(isOk);

        if (isOk && data.version) {
          console.log(`Server version: ${data.version}`);
          if (data.version !== '2.0') {
            console.warn('Server version mismatch. Please redeploy the Edge Function.');
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
      <div className="fixed top-4 left-1/2 z-50 w-full max-w-3xl -translate-x-1/2 transform px-4">
        <Alert className="border-amber-300 bg-amber-50 shadow-lg">
          <WifiOff className="h-5 w-5 text-amber-600" />
          <AlertDescription className="ml-2">
            <div className="space-y-2 text-amber-900">
              <p className="font-semibold">Modo local ativo - sem sincronizacao</p>
              <p className="text-sm">
                A Edge Function <strong>server</strong> do Supabase nao esta publicada ou nao respondeu.
                A aplicacao continua funcionando em <strong>modo local</strong>, mas os dados nao
                sao compartilhados entre dispositivos.
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Como habilitar a sincronizacao em tempo real?
                </summary>
                <ol className="ml-2 mt-2 list-inside list-decimal space-y-1">
                  <li>Publice a Edge Function <strong>server</strong> no projeto Supabase.</li>
                  <li>Execute a migration da tabela <strong>kv_store_d5bb9c63</strong>.</li>
                  <li>Teste os endpoints <strong>/functions/v1/server/health</strong> e <strong>/functions/v1/server/debug</strong>.</li>
                </ol>
                <p className="mt-2 break-all text-xs opacity-80">
                  Functions: <code className="rounded bg-amber-100 px-1 text-xs">{functionsDashboardUrl}</code>
                </p>
                <p className="mt-1 break-all text-xs opacity-80">
                  SQL Editor: <code className="rounded bg-amber-100 px-1 text-xs">{sqlEditorUrl}</code>
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
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <Wifi className="h-4 w-4" />
          <span>Conectado</span>
        </div>
      </div>
    );
  }

  return null;
}
