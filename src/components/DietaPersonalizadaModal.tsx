import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Camera, Upload, Send, Check, ImageIcon, FileText, MessageCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface DietaPersonalizadaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappLink: string;
  tenantName: string;
}

const DietaPersonalizadaModal = ({ open, onOpenChange, whatsappLink }: DietaPersonalizadaModalProps) => {
  const [step, setStep] = useState<"choice" | "form" | "success">("choice");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("emagrecer");
  const [preferences, setPreferences] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!name || !phone) {
      toast("Preencha nome e WhatsApp");
      return;
    }
    setSending(true);

    let photoUrl: string | null = null;

    // Upload foto para o Storage (se tiver)
    if (photoPreview && photoFile) {
      try {
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        const fileName = `dieta_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const { data: upload } = await supabase.storage
          .from("diet-photos")
          .upload(fileName, photoFile, { contentType: photoFile.type, upsert: false });
        if (upload) {
          const { data: publicUrl } = supabase.storage.from("diet-photos").getPublicUrl(upload.path);
          photoUrl = publicUrl?.publicUrl || null;
        }
      } catch (e) {
        console.error("Erro ao fazer upload da foto:", e);
      }
    }

    try {
      await supabase.from("diet_requests").insert({
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        goal,
        preferences: preferences || null,
        photo_url: photoUrl,
        status: "pending",
      });

      supabase.functions.invoke("notify-diet-request", {
        body: { customer_name: name, customer_phone: phone, customer_email: email || null, goal, preferences: preferences || null },
      }).catch(() => {});
    } catch (e) {
      console.error("Erro ao salvar:", e);
    }

    const msgParts = [
      `🥗 *NOVA DIETA PERSONALIZADA*`,
      `👤 Nome: ${name}`,
      `📱 WhatsApp: ${phone}`,
      ...(email ? [`📧 Email: ${email}`] : []),
      `🎯 Objetivo: ${goal === "emagrecer" ? "Emagrecer" : goal === "ganhar-massa" ? "Ganhar Massa" : "Manter Peso"}`,
      ...(preferences ? [`📝 Preferências: ${preferences}`] : []),
      ...(photoUrl ? [`📸 Foto: ${photoUrl}`] : []),
    ];

    try {
      const cleanLink = whatsappLink.replace("https://wa.me/", "");
      window.open(`https://wa.me/${cleanLink}?text=${encodeURIComponent(msgParts.join("\n"))}`, "_blank");
      setStep("success");
      toast("Solicitação registrada! ✅");
    } catch {
      toast("Erro ao abrir WhatsApp");
    }
    setSending(false);
  };

  const openWhatsApp = () => {
    const msg = "Olá! Gostaria de solicitar um orçamento de Dieta Personalizada 🥗\n\nPosso enviar foto da minha dieta ou falar minhas preferências?";
    const cleanLink = whatsappLink.replace("https://wa.me/", "");
    window.open(`https://wa.me/${cleanLink}?text=${encodeURIComponent(msg)}`, "_blank");
    setStep("success");
  };

  const resetForm = () => {
    setStep("choice");
    setName(""); setPhone(""); setEmail(""); setGoal("emagrecer");
    setPreferences(""); setPhotoPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        {step === "success" ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl">Solicitação enviada! 🎉</DialogTitle>
            <p className="text-muted-foreground text-sm">
              Recebemos seu pedido! Nossa equipe vai analisar e entrar em contato pelo WhatsApp.
            </p>
            <Button onClick={() => { onOpenChange(false); resetForm(); }} className="mt-4">Fechar</Button>
          </div>
        ) : step === "choice" ? (
          <>
            <DialogHeader>
              <DialogTitle>Dieta Personalizada 🥗</DialogTitle>
              <DialogDescription>
                Como você prefere solicitar seu orçamento?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <button
                onClick={() => setStep("form")}
                className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-base">Preencher formulário</p>
                  <p className="text-sm text-muted-foreground">Enviar dados e foto agora mesmo</p>
                </div>
              </button>
              <button
                onClick={openWhatsApp}
                className="w-full flex items-center gap-4 p-5 rounded-xl border-2 border-muted hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-base">Falar no WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Solicitar orçamento conversando</p>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Dieta Personalizada 🥗</DialogTitle>
              <DialogDescription>
                Mande sua dieta de nutricionista (foto ou documento) ou conte suas preferências.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="diet-name">Nome</Label>
                  <Input id="diet-name" placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="diet-phone">WhatsApp *</Label>
                  <Input id="diet-phone" placeholder="(77) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="diet-email">E-mail (opcional)</Label>
                <Input id="diet-email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Seu objetivo</Label>
                <RadioGroup value={goal} onValueChange={setGoal} className="flex gap-2">
                  {[
                    { value: "emagrecer", label: "🔥 Emagrecer" },
                    { value: "ganhar-massa", label: "💪 Ganhar Massa" },
                    { value: "manter", label: "⚖️ Manter Peso" },
                  ].map(o => (
                    <Label key={o.value} className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center text-sm font-medium transition-all ${goal === o.value ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"}`}>
                      <RadioGroupItem value={o.value} className="sr-only" />
                      {o.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label>📸 Anexar foto da dieta (opcional)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <div className="relative inline-block">
                      <img src={photoPreview} alt="Dieta" className="max-h-32 rounded-lg mx-auto" />
                      <Button type="button" variant="ghost" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-background border"
                        onClick={(e) => { e.stopPropagation(); setPhotoPreview(null); }}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-medium">Clique para enviar foto</span>
                      <span className="text-xs">ou documento da sua dieta</span>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="diet-preferences">✍️ Ou escreva suas preferências</Label>
                <Textarea id="diet-preferences" placeholder="Ex: Quero 14 marmitas FIT, não como carne de porco, prefiro frango e peixe, sem glúten..." value={preferences} onChange={e => setPreferences(e.target.value)} className="min-h-[80px]" />
              </div>

              <Button className="w-full gap-2 h-12 text-base" onClick={handleSubmit} disabled={sending || !name || !phone}>
                <Send className="w-4 h-4" />
                {sending ? "Enviando..." : "Solicitar Dieta Personalizada"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Ao enviar, seus dados serão analisados pela nossa equipe.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DietaPersonalizadaModal;