import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, ChevronRight, ChevronLeft, Send, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOTAL_STEPS = 6;

const Licenca = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    interesse_faturar: "",
    comprometimento: "",
    nome: "",
    whatsapp: "",
    expectativa: "",
    investimento_ok: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setAnswer = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return !!answers.interesse_faturar;
      case 1: return !!answers.comprometimento;
      case 2: return answers.nome.trim().length >= 2;
      case 3: return answers.whatsapp.replace(/\D/g, "").length >= 10;
      case 4: return answers.expectativa.trim().length >= 5;
      case 5: return !!answers.investimento_ok;
      default: return false;
    }
  };

  const next = () => {
    if (canAdvance() && step < TOTAL_STEPS - 1) setStep(step + 1);
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const submit = async () => {
    if (!canAdvance()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: answers.nome.trim(),
        phone: answers.whatsapp.replace(/\D/g, ""),
        objective: "licenca_marca",
        specification: JSON.stringify({
          interesse_faturar: answers.interesse_faturar,
          comprometimento: answers.comprometimento,
          expectativa: answers.expectativa,
          investimento_ok: answers.investimento_ok,
        }),
        recommendation_name: "Licença de Marca",
        recommendation_type: "licenca",
      });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const progressPercent = ((step + 1) / TOTAL_STEPS) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <Helmet>
          <title>Licença de Marca | Dieta Já</title>
        </Helmet>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Recebemos seu interesse! 🎉</h1>
          <p className="text-gray-400 text-lg mb-6">
            Nossa equipe vai entrar em contato pelo WhatsApp em até 24h para conversar sobre a licença.
          </p>
          <Button
            onClick={() => window.location.href = "/"}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Voltar ao site
          </Button>
        </motion.div>
      </div>
    );
  }

  const OptionButton = ({ label, value, selected, onClick }: { label: string; value: string; selected: boolean; onClick: () => void }) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all text-lg font-medium ${
        selected
          ? "border-green-500 bg-green-500/10 text-white"
          : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500"
      }`}
    >
      <span className="flex items-center gap-3">
        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? "border-green-500 bg-green-500" : "border-gray-600"
        }`}>
          {selected && <Check className="w-4 h-4 text-white" />}
        </span>
        {label}
      </span>
    </motion.button>
  );

  const steps = [
    // Step 0 - Hook
    <div key="0" className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
        Faturar <span className="text-green-400">R$20.000</span> trabalhando de segunda a sexta na cozinha da sua casa te ajudaria?
      </h2>
      <div className="space-y-3">
        <OptionButton label="Sim, muito! 🙌" value="sim" selected={answers.interesse_faturar === "sim"} onClick={() => { setAnswer("interesse_faturar", "sim"); setTimeout(next, 400); }} />
        <OptionButton label="Talvez, quero saber mais" value="talvez" selected={answers.interesse_faturar === "talvez"} onClick={() => { setAnswer("interesse_faturar", "talvez"); setTimeout(next, 400); }} />
        <OptionButton label="Não tenho interesse" value="nao" selected={answers.interesse_faturar === "nao"} onClick={() => { setAnswer("interesse_faturar", "nao"); setTimeout(next, 400); }} />
      </div>
    </div>,

    // Step 1 - Credibility + Commitment
    <div key="1" className="space-y-6">
      <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700 space-y-3 mb-2">
        <p className="text-green-400 font-semibold text-sm uppercase tracking-wide">Sobre nós</p>
        <p className="text-gray-200 text-base leading-relaxed">
          Estamos há <strong className="text-white">10 anos</strong> no mercado de alimentação saudável. Hoje faturamos mais de <strong className="text-green-400">R$140.000/mês</strong> e decidimos abrir nosso modelo de sucesso — já validado — para outros empreendedores.
        </p>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
        Você tem comprometimento e interesse em seguir o passo a passo?
      </h2>
      <div className="space-y-3">
        <OptionButton label="Sim, estou comprometido(a)! 💪" value="sim" selected={answers.comprometimento === "sim"} onClick={() => { setAnswer("comprometimento", "sim"); setTimeout(next, 400); }} />
        <OptionButton label="Preciso entender melhor" value="talvez" selected={answers.comprometimento === "talvez"} onClick={() => { setAnswer("comprometimento", "talvez"); setTimeout(next, 400); }} />
      </div>
    </div>,

    // Step 2 - Name
    <div key="2" className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
        Qual é o seu nome?
      </h2>
      <Input
        value={answers.nome}
        onChange={(e) => setAnswer("nome", e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && canAdvance() && next()}
        placeholder="Seu nome completo"
        className="bg-gray-800/60 border-gray-700 text-white text-lg h-14 placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
        autoFocus
      />
      <p className="text-gray-500 text-sm">Pressione Enter ↵ para continuar</p>
    </div>,

    // Step 3 - WhatsApp
    <div key="3" className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
        Qual o seu WhatsApp, <span className="text-green-400">{answers.nome.split(" ")[0]}</span>?
      </h2>
      <Input
        value={answers.whatsapp}
        onChange={(e) => setAnswer("whatsapp", formatPhone(e.target.value))}
        onKeyDown={(e) => e.key === "Enter" && canAdvance() && next()}
        placeholder="(00) 00000-0000"
        type="tel"
        className="bg-gray-800/60 border-gray-700 text-white text-lg h-14 placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20"
        autoFocus
      />
      <p className="text-gray-500 text-sm">Pressione Enter ↵ para continuar</p>
    </div>,

    // Step 4 - Expectation
    <div key="4" className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
        O que você espera da licença de marca? Já tem estrutura para iniciar?
      </h2>
      <Textarea
        value={answers.expectativa}
        onChange={(e) => setAnswer("expectativa", e.target.value)}
        placeholder="Conte um pouco sobre suas expectativas e situação atual..."
        className="bg-gray-800/60 border-gray-700 text-white text-base min-h-[120px] placeholder:text-gray-500 focus:border-green-500 focus:ring-green-500/20 resize-none"
        autoFocus
      />
    </div>,

    // Step 5 - Investment
    <div key="5" className="space-y-6">
      <div className="bg-gray-800/60 rounded-2xl p-5 border border-gray-700 space-y-3 mb-2">
        <p className="text-green-400 font-semibold text-sm uppercase tracking-wide">Investimento</p>
        <p className="text-gray-200 text-base leading-relaxed">
          O investimento na licença de marca é de <strong className="text-white">R$4.000</strong>, podendo ser dividido em <strong className="text-green-400">até 12x</strong>. Inclui acompanhamento direto com os sócios do negócio e gestores.
        </p>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
        Você tem esse valor disponível para investir?
      </h2>
      <div className="space-y-3">
        <OptionButton label="Sim, tenho disponível ✅" value="sim" selected={answers.investimento_ok === "sim"} onClick={() => setAnswer("investimento_ok", "sim")} />
        <OptionButton label="Consigo parcelado em 12x" value="parcelado" selected={answers.investimento_ok === "parcelado"} onClick={() => setAnswer("investimento_ok", "parcelado")} />
        <OptionButton label="Preciso me organizar" value="organizar" selected={answers.investimento_ok === "organizar"} onClick={() => setAnswer("investimento_ok", "organizar")} />
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Helmet>
        <title>Licença de Marca | Dieta Já</title>
        <meta name="description" content="Seja um licenciado Dieta Já e fature até R$20.000/mês com nosso modelo validado de alimentação saudável." />
      </Helmet>

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-gray-800">
          <motion.div
            className="h-full bg-green-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Header */}
      <div className="pt-8 pb-4 px-4 text-center">
        <p className="text-green-400 font-bold text-sm tracking-widest uppercase">Método Dieta Já</p>
        <p className="text-gray-500 text-xs mt-1">{step + 1} de {TOTAL_STEPS}</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-32">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-sm border-t border-gray-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {step > 0 && (
            <Button
              onClick={prev}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={next}
              disabled={!canAdvance()}
              className="bg-green-600 hover:bg-green-700 text-white px-8 h-12 text-base disabled:opacity-30"
            >
              Continuar
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={!canAdvance() || submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-8 h-12 text-base disabled:opacity-30"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              Enviar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Licenca;
