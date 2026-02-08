import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, MapPin, ChevronRight, Check, X } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  preferred_delivery_option: string | null;
  preferred_address: string | null;
}

interface ProfileOnboardingProps {
  profile: Profile;
  onComplete: () => void;
}

const steps = [
  { key: 'name', icon: User, label: 'Nome completo', placeholder: 'Seu nome completo' },
  { key: 'phone', icon: Phone, label: 'WhatsApp', placeholder: '(00) 00000-0000' },
  { key: 'address', icon: MapPin, label: 'Endereço de entrega', placeholder: 'Rua, número, bairro...' },
] as const;

const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export default function ProfileOnboarding({ profile, onComplete }: ProfileOnboardingProps) {
  const { brand } = useTenantConfig();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [form, setForm] = useState({
    name: profile.name || '',
    phone: profile.phone || '',
    address: profile.preferred_address || '',
  });

  // Don't show if profile is complete or dismissed
  const isIncomplete = !profile.phone || !profile.preferred_address;
  if (!isIncomplete || dismissed) return null;

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleSave();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: form.name || profile.name,
          phone: form.phone,
          preferred_address: form.address,
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast({
        title: 'Cadastro completo! 🎉',
        description: 'Seus dados foram salvos com sucesso.',
      });
      onComplete();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const currentValue = step === 0 ? form.name : step === 1 ? form.phone : form.address;
  const canAdvance = currentValue.trim().length > 0;

  return (
    <Card className="mb-6 border-primary/30 shadow-lg overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-base">
              Complete seu cadastro {brand.name !== 'Meu Restaurante' ? `no ${brand.name}` : ''} 📝
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Passo {step + 1} de {steps.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -mt-1 -mr-1"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm">
                <currentStep.icon className="h-4 w-4 text-primary" />
                {currentStep.label}
              </Label>

              {step === 2 ? (
                <Textarea
                  placeholder={currentStep.placeholder}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              ) : (
                <Input
                  type={step === 1 ? 'tel' : 'text'}
                  placeholder={currentStep.placeholder}
                  value={step === 0 ? form.name : form.phone}
                  onChange={(e) => {
                    if (step === 0) setForm({ ...form, name: e.target.value });
                    else setForm({ ...form, phone: formatPhoneInput(e.target.value) });
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance && handleNext()}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-4">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
              Voltar
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1"
            onClick={handleNext}
            disabled={!canAdvance || saving}
          >
            {saving ? 'Salvando...' : isLastStep ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Salvar
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}