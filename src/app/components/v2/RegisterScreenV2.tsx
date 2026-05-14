import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useSimpleQueue } from '../../context/SimpleQueueContext';
import { Loader2, MapPin } from 'lucide-react';
import logo from '../../../imports/image.png';
import * as api from '../../../utils/api';
import type { UnitDTO } from '../../../utils/api';

const RESERVED = new Set(['login', 'recepcao', 'fila', 'qrcode', 'log', 'admin', 'assets']);

export default function RegisterScreenV2() {
  const { unitSlug } = useParams<{ unitSlug: string }>();
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unit, setUnit] = useState<UnitDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingUnit, setLoadingUnit] = useState(true);
  const navigate = useNavigate();
  const { addToQueue } = useSimpleQueue();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!unitSlug || RESERVED.has(unitSlug.toLowerCase())) {
        setLoadError('Unidade inválida ou URL reservada.');
        setUnit(null);
        setLoadingUnit(false);
        return;
      }

      setLoadingUnit(true);
      setLoadError(null);
      try {
        const u = await api.fetchUnitBySlug(unitSlug);
        if (!cancelled) {
          setUnit(u);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Unidade não encontrada. Verifique o link ou o QR Code.');
          setUnit(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingUnit(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [unitSlug]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || !unit) {
      return;
    }

    if (patientName && phone) {
      setIsSubmitting(true);
      try {
        const registration = await addToQueue(patientName, phone, unit.id);
        navigate('fila', {
          relative: 'path',
          state: {
            patientId: registration.id,
            accessToken: registration.accessToken,
            unitId: unit.id,
            unitSlug: unit.slug,
          },
        });
      } catch (error) {
        console.error('Error adding patient to queue:', error);
        alert('Erro ao entrar na fila. Tente novamente.');
        setIsSubmitting(false);
      }
    }
  };

  if (loadingUnit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (loadError || !unit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={logo} alt="CBTEA Logo" className="h-12 mx-auto mb-3" />
            <CardTitle className="text-xl">Check-in indisponível</CardTitle>
            <CardDescription>{loadError || 'Unidade não encontrada.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => navigate('/')}>
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
          <CardTitle className="text-xl sm:text-2xl">Cadastro na Fila</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            <span className="font-medium text-gray-800">{unit.name}</span>
          </CardDescription>
          <div className="flex items-start gap-2 text-left text-xs text-gray-600 bg-gray-50 rounded-lg p-3 mt-2 border">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{unit.address}</span>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Paciente</Label>
              <Input
                id="name"
                type="text"
                placeholder="Digite o nome completo"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="text"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={15}
                disabled={isSubmitting}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  <span className="text-sm sm:text-base">Entrando na fila...</span>
                </>
              ) : (
                <span className="text-sm sm:text-base">Entrar na Fila</span>
              )}
            </Button>
            <div className="text-center text-xs sm:text-sm text-gray-500 mt-4"> <p>Não feche o seu navegador, até concluir o atendimento!</p></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
