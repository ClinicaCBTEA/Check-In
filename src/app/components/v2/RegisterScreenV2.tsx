import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useSimpleQueue } from '../../context/SimpleQueueContext';
import { UserCircle, Loader2 } from 'lucide-react';
import logo from '../../../imports/image.png';

export default function RegisterScreenV2() {
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { addToQueue } = useSimpleQueue();

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevenir múltiplos cliques
    if (isSubmitting) {
      return;
    }

    if (patientName && phone) {
      setIsSubmitting(true);
      try {
        const patientId = await addToQueue(patientName, phone);
        navigate('/fila', { state: { patientId } });
      } catch (error) {
        console.error('Error adding patient to queue:', error);
        alert('Erro ao entrar na fila. Tente novamente.');
        setIsSubmitting(false);
      }
      // Nota: Não resetamos isSubmitting em caso de sucesso porque navegamos para outra página
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <img src={logo} alt="CBTEA Logo" className="h-12 sm:h-16" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Cadastro na Fila</CardTitle>
          <CardDescription className="text-sm sm:text-base">Informe seus dados para entrar na fila de atendimento</CardDescription>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
