import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  MessageCircle,
  Mail,
  Edit,
  Save,
  CheckCircle,
  ChefHat,
  Package,
  Truck,
  CircleCheck,
  XCircle,
  Star,
  Gift,
  RefreshCw,
  Clock
} from "lucide-react";

interface MarketingMessage {
  id: string;
  message_type: string;
  title: string;
  whatsapp_template: string;
  email_subject: string;
  email_body_html: string;
  is_active: boolean;
  delay_days: number;
  trigger_quantity: number | null;
  coupon_code: string | null;
  discount_percent: number | null;
}

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  status_approved: { icon: <CheckCircle className="w-5 h-5" />, color: "text-green-500" },
  status_preparing: { icon: <ChefHat className="w-5 h-5" />, color: "text-blue-500" },
  status_ready: { icon: <Package className="w-5 h-5" />, color: "text-purple-500" },
  status_delivering: { icon: <Truck className="w-5 h-5" />, color: "text-orange-500" },
  status_delivered: { icon: <CircleCheck className="w-5 h-5" />, color: "text-emerald-500" },
  status_cancelled: { icon: <XCircle className="w-5 h-5" />, color: "text-red-500" },
  review_request: { icon: <Star className="w-5 h-5" />, color: "text-yellow-500" },
  recompra_5: { icon: <Gift className="w-5 h-5" />, color: "text-pink-500" },
  recompra_14: { icon: <Gift className="w-5 h-5" />, color: "text-pink-500" },
  recompra_28: { icon: <Gift className="w-5 h-5" />, color: "text-pink-500" },
};

const MarketingManager = () => {
  const [messages, setMessages] = useState<MarketingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<MarketingMessage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('marketing_messages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_messages' },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('marketing_messages')
      .select('*')
      .order('message_type');

    if (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Erro ao carregar mensagens",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMessages(data || []);
    setLoading(false);
  };

  const handleToggleActive = async (message: MarketingMessage) => {
    const { error } = await supabase
      .from('marketing_messages')
      .update({ is_active: !message.is_active })
      .eq('id', message.id);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: message.is_active ? "Mensagem desativada" : "Mensagem ativada",
    });
  };

  const handleSave = async () => {
    if (!editingMessage) return;
    setSaving(true);

    const { error } = await supabase
      .from('marketing_messages')
      .update({
        title: editingMessage.title,
        whatsapp_template: editingMessage.whatsapp_template,
        email_subject: editingMessage.email_subject,
        email_body_html: editingMessage.email_body_html,
        delay_days: editingMessage.delay_days,
        coupon_code: editingMessage.coupon_code,
        discount_percent: editingMessage.discount_percent,
      })
      .eq('id', editingMessage.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Mensagem atualizada!",
      description: "As alterações foram salvas com sucesso.",
    });
    setEditingMessage(null);
  };

  const statusMessages = messages.filter(m => m.message_type.startsWith('status_'));
  const reviewMessage = messages.find(m => m.message_type === 'review_request');
  const recompraMessages = messages.filter(m => m.message_type.startsWith('recompra_'));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Messages Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Mensagens de Status do Pedido</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure as mensagens enviadas automaticamente quando o status do pedido muda.
        </p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statusMessages.map((message) => {
            const iconConfig = STATUS_ICONS[message.message_type];
            return (
              <Card key={message.id} className={!message.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={iconConfig?.color}>{iconConfig?.icon}</span>
                      <CardTitle className="text-base">{message.title}</CardTitle>
                    </div>
                    <Switch
                      checked={message.is_active}
                      onCheckedChange={() => handleToggleActive(message)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    <span className="truncate">{message.whatsapp_template.slice(0, 50)}...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="truncate">{message.email_subject}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditingMessage(message)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Mensagem
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Review Request Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Avaliação Pós-Entrega</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Solicite avaliação do cliente após a entrega do pedido.
        </p>

        {reviewMessage && (
          <Card className={!reviewMessage.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{reviewMessage.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Enviado {reviewMessage.delay_days} dia(s) após entrega
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={reviewMessage.is_active}
                    onCheckedChange={() => handleToggleActive(reviewMessage)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMessage(reviewMessage)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
      </section>

      <Separator />

      {/* Recompra Campaigns Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-pink-500" />
          <h2 className="text-lg font-semibold">Campanhas de Recompra</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Envie cupons de desconto automáticos para clientes após alguns dias da entrega.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {recompraMessages.map((message) => (
            <Card key={message.id} className={!message.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <Gift className="w-4 h-4 text-pink-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{message.trigger_quantity} marmitas</CardTitle>
                      <CardDescription className="text-xs">
                        {message.delay_days} dias após entrega
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={message.is_active}
                    onCheckedChange={() => handleToggleActive(message)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cupom:</span>
                  <Badge variant="secondary" className="font-mono">
                    {message.coupon_code || "—"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Desconto:</span>
                  <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                    {message.discount_percent || 0}% OFF
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setEditingMessage(message)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Campanha
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Variables Guide */}
      <section className="mt-8">
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variáveis disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { var: "{nome}", desc: "Primeiro nome" },
                { var: "{pedido}", desc: "Número do pedido" },
                { var: "{total}", desc: "Valor total" },
                { var: "{link}", desc: "Link de rastreamento" },
                { var: "{cupom}", desc: "Código do cupom" },
                { var: "{desconto}", desc: "% de desconto" },
              ].map((v) => (
                <Badge key={v.var} variant="outline" className="font-mono text-xs">
                  {v.var} <span className="ml-1 text-muted-foreground font-normal">= {v.desc}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Edit Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar: {editingMessage?.title}
            </DialogTitle>
          </DialogHeader>

          {editingMessage && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={editingMessage.title}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, title: e.target.value })
                  }
                />
              </div>

              {editingMessage.message_type.startsWith('recompra_') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delay">Dias após entrega</Label>
                    <Input
                      id="delay"
                      type="number"
                      value={editingMessage.delay_days}
                      onChange={(e) =>
                        setEditingMessage({ ...editingMessage, delay_days: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coupon">Código do Cupom</Label>
                    <Input
                      id="coupon"
                      value={editingMessage.coupon_code || ""}
                      onChange={(e) =>
                        setEditingMessage({ ...editingMessage, coupon_code: e.target.value })
                      }
                      placeholder="VOLTA10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">% de Desconto</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={editingMessage.discount_percent || ""}
                      onChange={(e) =>
                        setEditingMessage({ ...editingMessage, discount_percent: parseInt(e.target.value) || 0 })
                      }
                      placeholder="10"
                    />
                  </div>
                </div>
              )}

              {editingMessage.message_type === 'review_request' && (
                <div className="space-y-2">
                  <Label htmlFor="delay">Dias após entrega</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={editingMessage.delay_days}
                    onChange={(e) =>
                      setEditingMessage({ ...editingMessage, delay_days: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-500" />
                  Template WhatsApp
                </Label>
                <Textarea
                  id="whatsapp"
                  value={editingMessage.whatsapp_template}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, whatsapp_template: e.target.value })
                  }
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email_subject" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  Assunto do Email
                </Label>
                <Input
                  id="email_subject"
                  value={editingMessage.email_subject}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, email_subject: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_body">Corpo do Email (HTML)</Label>
                <Textarea
                  id="email_body"
                  value={editingMessage.email_body_html}
                  onChange={(e) =>
                    setEditingMessage({ ...editingMessage, email_body_html: e.target.value })
                  }
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingManager;
