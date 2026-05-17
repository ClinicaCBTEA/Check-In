import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCcw } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { APP_NAME } from '../branding';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import logo from '../../imports/image.png';

const DYNAMIC_IMPORT_ERROR_MARKERS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'ChunkLoadError',
];

function isDynamicImportError(error: unknown) {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  return DYNAMIC_IMPORT_ERROR_MARKERS.some((marker) => message.includes(marker));
}

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro inesperado';
}

export default function AppRouteError() {
  const error = useRouteError();
  const isChunkError = isDynamicImportError(error);
  const technicalMessage = getErrorMessage(error);

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="text-center">
          <img src={logo} alt="CBTEA Logo" className="h-14 mx-auto mb-4" />
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">
            {isChunkError ? 'Atualização necessária' : 'Ops, algo saiu do esperado'}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {isChunkError
              ? 'O sistema recebeu uma atualização recente. Atualize a página para continuar usando o Check-in de Atendimento CBTEA.'
              : 'Não foi possível concluir esta ação agora. Você pode tentar novamente em instantes.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">{APP_NAME}</p>
            <p className="mt-1">
              {isChunkError
                ? 'Se a tela travou após uma publicação nova, basta atualizar uma vez.'
                : 'Se o problema continuar, a equipe pode verificar a conexão e a versão publicada.'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" className="flex-1" onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar página
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={() => (window.location.href = '/')}>
              <Home className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
          </div>

          {import.meta.env.DEV && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
              <p className="font-semibold">Detalhe técnico</p>
              <p className="mt-1 break-words">{technicalMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
