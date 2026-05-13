import { useNavigate } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useState, useEffect } from 'react';

export default function QrCodeScreenV2() {
  const navigate = useNavigate();
  const [qrSize, setQrSize] = useState(224);

  // URL do projeto publicado no Figma Make
  const qrCodeUrl = 'https://forum-zone-63638029.figma.site/';

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
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src="/src/imports/image.png" alt="CBTEA Logo" className="h-12 sm:h-16" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Bem-vindo</CardTitle>
          <CardDescription className="text-sm sm:text-base">Escaneie o QR Code para se cadastrar na fila</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:gap-6">
          <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-white border-2 sm:border-4 border-gray-200 rounded-lg flex items-center justify-center p-3 sm:p-4">
            <QRCodeSVG
              value={qrCodeUrl}
              size={qrSize}
              level="H"
              includeMargin={false}
            />
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
