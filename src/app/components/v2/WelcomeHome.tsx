import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useUserManagement } from '../../context/UserManagementContext';
import { Building2, QrCode } from 'lucide-react';
import logo from '../../../imports/image.png';

export default function WelcomeHome() {
  const { units, refreshUnits } = useUserManagement();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <img src={logo} alt="CBTEA Logo" className="h-14 sm:h-16 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Check-in por unidade</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Escolha sua unidade para entrar na fila de atendimento.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Unidades
            </CardTitle>
            <CardDescription>Cada unidade possui endereço e QR Code próprios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {units.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Lista de unidades indisponível no momento. Tente atualizar ou fale com a recepção.
              </p>
            ) : (
              units.map((u) => (
                <div
                  key={u.id}
                  className="border rounded-lg p-4 hover:bg-emerald-50/50 transition flex flex-col gap-2"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500 mt-1 break-words">{u.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button asChild size="sm" variant="default">
                      <Link to={`/${u.slug}`}>Check-in</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/${u.slug}/qrcode`}>
                        <QrCode className="w-4 h-4 mr-1 inline" />
                        QR Code
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => refreshUnits()}>
              Atualizar lista
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
