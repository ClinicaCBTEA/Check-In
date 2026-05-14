import { useNavigate, useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useState, useEffect } from 'react';
import logo from '../../../imports/image.png';
import * as api from '../../../utils/api';
import type { UnitDTO } from '../../../utils/api';
import { Loader2, MapPin } from 'lucide-react';

export default function QrCodeScreenV2() {
  const navigate = useNavigate();
  const { unitSlug: unitSlugParam } = useParams<{ unitSlug?: string }>();
  const [qrSize, setQrSize] = useState(224);
  const [unit, setUnit] = useState<UnitDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const appBaseUrl =
    import.meta.env.VITE_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const slug = unitSlugParam || 'unidadebarra';
      try {
        const u = await api.fetchUnitBySlug(slug);
        if (!cancelled) {
          setUnit(u);
        }
      } catch {
        if (!cancelled) {
          setError('Unidade não encontrada para este QR Code.');
          setUnit(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [unitSlugParam]);

  const qrCodeUrl = unit ? `${appBaseUrl}/${unit.slug}` : '';

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) {
        setQrSize(168);
      } else if (window.innerWidth < 768) {
        setQrSize(192);
      } else {
        setQrSize(224);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleScanQR = () => {
    if (unit) {
      navigate(`/${unit.slug}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>{error || 'Unidade indisponível.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src={logo} alt="CBTEA Logo" className="h-12 sm:h-16" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Bem-vindo — {unit.name}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Escaneie o QR Code para o check-in nesta unidade
          </CardDescription>
          <div className="flex items-start gap-2 text-left text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mt-2 border">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{unit.address}</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:gap-6">
          <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-white border-2 sm:border-4 border-gray-200 rounded-lg flex items-center justify-center p-3 sm:p-4">
            <QRCodeSVG value={qrCodeUrl} size={qrSize} level="H" includeMargin={false} />
          </div>
          <div className="text-center w-full">
            <p className="text-xs sm:text-sm text-gray-500 mb-2">Ou clique no botão abaixo para testar</p>
            <Button onClick={handleScanQR} size="lg" className="w-full">
              <span className="text-sm sm:text-base">Simular Escaneamento</span>
            </Button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 w-full">
            <p className="text-xs text-blue-800 break-all">
              <strong>URL:</strong> {qrCodeUrl}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
