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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  Ticket,
  Plus,
  Percent,
  DollarSign,
  Infinity as InfinityIcon,
  Calendar,
  Timer,
  Bell
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

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_customer: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

interface ReminderSetting {
  id: string;
  reminder_type: string;
  delay_minutes: number;
  is_active: boolean;
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
  order_pix_pending: { icon: <MessageCircle className="w-5 h-5" />, color: "text-amber-500" },
  order_whatsapp_pending: { icon: <MessageCircle className="w-5 h-5" />, color: "text-green-500" },
  order_confirmed: { icon: <CheckCircle className="w-5 h-5" />, color: "text-emerald-500" },
};

const DEFAULT_COUPON: Omit<Coupon, 'id' | 'current_uses'> = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: 10,
  min_order_value: 0,
  max_uses: null,
  max_uses_per_customer: 1,
  valid_from: null,
  valid_until: null,
  is_active: true,
};

const MarketingManager = () => {
  const [messages, setMessages] = useState<MarketingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<MarketingMessage | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Coupon states
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Reminder settings states
  const [reminderSettings, setReminderSettings] = useState<ReminderSetting[]>([]);
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchCoupons();
    fetchReminderSettings();
    
    // Subscribe to realtime updates
    const messagesChannel = supabase
      .channel('marketing_messages_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_messages' },
        () => fetchMessages()
      )
      .subscribe();

    const couponsChannel = supabase
      .channel('coupons_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupons' },
        () => fetchCoupons()
      )
      .subscribe();

    const reminderChannel = supabase
      .channel('reminder_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminder_settings' },
        () => fetchReminderSettings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(couponsChannel);
      supabase.removeChannel(reminderChannel);
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

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching coupons:', error);
      return;
    }

    setCoupons(data || []);
  };

  const fetchReminderSettings = async () => {
    const { data, error } = await supabase
      .from('reminder_settings')
      .select('*')
      .order('reminder_type');

    if (error) {
      console.error('Error fetching reminder settings:', error);
      return;
    }

    setReminderSettings(data || []);
  };

  const handleUpdateReminderSetting = async (setting: ReminderSetting, updates: Partial<ReminderSetting>) => {
    setSavingReminder(true);
    const { error } = await supabase
      .from('reminder_settings')
      .update(updates)
      .eq('id', setting.id);

    setSavingReminder(false);

    if (error) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Configuração atualizada!",
    });
    fetchReminderSettings();
  };

  const formatDelayDisplay = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
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

  // Coupon CRUD functions
  const handleToggleCouponActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);

    if (error) {
      toast({
        title: "Erro ao atualizar cupom",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: coupon.is_active ? "Cupom desativado" : "Cupom ativado",
    });
  };

  const handleSaveCoupon = async () => {
    if (!editingCoupon) return;
    setSavingCoupon(true);

    const couponData = {
      code: editingCoupon.code?.trim().toUpperCase() || '',
      description: editingCoupon.description || null,
      discount_type: editingCoupon.discount_type || 'percent',
      discount_value: editingCoupon.discount_value || 0,
      min_order_value: editingCoupon.min_order_value || 0,
      max_uses: editingCoupon.max_uses || null,
      max_uses_per_customer: editingCoupon.max_uses_per_customer || 1,
      valid_from: editingCoupon.valid_from || null,
      valid_until: editingCoupon.valid_until || null,
      is_active: editingCoupon.is_active ?? true,
    };

    if (!couponData.code) {
      toast({
        title: "Código obrigatório",
        description: "Digite um código para o cupom.",
        variant: "destructive",
      });
      setSavingCoupon(false);
      return;
    }

    let error;
    if (isCreatingCoupon) {
      const result = await supabase.from('coupons').insert(couponData);
      error = result.error;
    } else {
      const result = await supabase
        .from('coupons')
        .update(couponData)
        .eq('id', editingCoupon.id);
      error = result.error;
    }

    setSavingCoupon(false);

    if (error) {
      toast({
        title: "Erro ao salvar cupom",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isCreatingCoupon ? "Cupom criado!" : "Cupom atualizado!",
      description: `O cupom ${couponData.code} foi salvo com sucesso.`,
    });
    setEditingCoupon(null);
    setIsCreatingCoupon(false);
  };

  const openCreateCoupon = () => {
    setEditingCoupon({ ...DEFAULT_COUPON });
    setIsCreatingCoupon(true);
  };

  const openEditCoupon = (coupon: Coupon) => {
    setEditingCoupon({ ...coupon });
    setIsCreatingCoupon(false);
  };

  const getCouponStatus = (coupon: Coupon): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    const now = new Date();
    if (!coupon.is_active) {
      return { label: 'Inativo', variant: 'secondary' };
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { label: 'Expirado', variant: 'destructive' };
    }
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return { label: 'Esgotado', variant: 'destructive' };
    }
    return { label: 'Ativo', variant: 'default' };
  };

  const statusMessages = messages.filter(m => m.message_type.startsWith('status_'));
  const reviewMessage = messages.find(m => m.message_type === 'review_request');
  const recompraMessages = messages.filter(m => m.message_type.startsWith('recompra_'));
  const orderMessages = messages.filter(m => m.message_type.startsWith('order_'));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Order Checkout Messages Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold">Templates de Checkout (WhatsApp)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Mensagens enviadas automaticamente ao cliente durante o processo de compra.
        </p>
        
        <div className="grid gap-4 md:grid-cols-3">
          {orderMessages.map((message) => {
            const iconConfig = STATUS_ICONS[message.message_type];
            const descriptions: Record<string, string> = {
              order_pix_pending: "Enviado quando o cliente escolhe pagar via PIX (inclui código PIX)",
              order_whatsapp_pending: "Enviado quando o cliente escolhe finalizar via WhatsApp",
              order_confirmed: "Enviado quando o pagamento é confirmado",
            };
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
                  <CardDescription className="text-xs mt-2">
                    {descriptions[message.message_type]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    <span className="truncate">{message.whatsapp_template.slice(0, 50)}...</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditingMessage(message)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

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

      <Separator />

      {/* Coupons Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-violet-500" />
            <h2 className="text-lg font-semibold">Cupons de Desconto</h2>
          </div>
          <Button size="sm" onClick={openCreateCoupon}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cupom
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Crie cupons de desconto para campanhas específicas. Os cupons são validados automaticamente no checkout.
        </p>

        {coupons.length === 0 ? (
          <Card className="p-8 text-center">
            <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum cupom criado ainda.</p>
            <Button className="mt-4" onClick={openCreateCoupon}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Cupom
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => {
              const status = getCouponStatus(coupon);
              return (
                <Card key={coupon.id} className={status.variant !== 'default' ? "opacity-70" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-base px-3 py-1">
                        {coupon.code}
                      </Badge>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Desconto:</span>
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        {coupon.discount_type === 'percent' ? (
                          <><Percent className="w-3 h-3 mr-1" />{coupon.discount_value}%</>
                        ) : (
                          <>R$ {coupon.discount_value.toFixed(2).replace('.', ',')}</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Usos:</span>
                      <span className="text-sm font-medium">
                        {coupon.current_uses}/{coupon.max_uses ?? <Infinity className="w-4 h-4 inline" />}
                      </span>
                    </div>
                    {coupon.valid_until && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Válido até:</span>
                        <span className="text-sm flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground italic">{coupon.description}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditCoupon(coupon)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={() => handleToggleCouponActive(coupon)}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* Payment Reminder Settings Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Lembretes de Pagamento PIX</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Configure os intervalos para envio de lembretes automáticos para pedidos aguardando pagamento.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {reminderSettings.map((setting) => {
            const isFirst = setting.reminder_type === 'first_reminder';
            return (
              <Card key={setting.id} className={!setting.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${isFirst ? 'bg-amber-500/10' : 'bg-orange-500/10'} flex items-center justify-center`}>
                        <Timer className={`w-4 h-4 ${isFirst ? 'text-amber-500' : 'text-orange-500'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{isFirst ? '1º Lembrete' : '2º Lembrete'}</CardTitle>
                        <CardDescription className="text-xs">
                          {isFirst ? 'Primeiro aviso de pagamento pendente' : 'Última tentativa antes de expirar'}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={setting.is_active}
                      onCheckedChange={(checked) => handleUpdateReminderSetting(setting, { is_active: checked })}
                      disabled={savingReminder}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`delay-${setting.id}`}>Intervalo após criação do pedido</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`delay-${setting.id}`}
                        type="number"
                        min={1}
                        max={1440}
                        value={setting.delay_minutes}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setReminderSettings(prev => prev.map(s => 
                            s.id === setting.id ? { ...s, delay_minutes: value } : s
                          ));
                        }}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">minutos</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        = {formatDelayDisplay(setting.delay_minutes)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpdateReminderSetting(setting, { delay_minutes: setting.delay_minutes })}
                    disabled={savingReminder}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Intervalo
                  </Button>
                </CardContent>
              </Card>
            );
          })}
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
                { var: "{subtotal}", desc: "Subtotal" },
                { var: "{itens}", desc: "Lista de itens" },
                { var: "{entrega}", desc: "Info de entrega" },
                { var: "{taxa_entrega}", desc: "Taxa de entrega" },
                { var: "{desconto}", desc: "Valor do desconto" },
                { var: "{pix_code}", desc: "Código PIX (copia e cola)" },
                { var: "{link}", desc: "Link de rastreamento" },
                { var: "{cupom}", desc: "Código do cupom" },
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

      {/* Coupon Edit Dialog */}
      <Dialog open={!!editingCoupon} onOpenChange={() => { setEditingCoupon(null); setIsCreatingCoupon(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-violet-500" />
              {isCreatingCoupon ? 'Novo Cupom' : 'Editar Cupom'}
            </DialogTitle>
          </DialogHeader>

          {editingCoupon && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="coupon_code">Código do Cupom *</Label>
                <Input
                  id="coupon_code"
                  value={editingCoupon.code || ''}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })
                  }
                  placeholder="PROMO10"
                  className="font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_type">Tipo de Desconto</Label>
                  <Select
                    value={editingCoupon.discount_type || 'percent'}
                    onValueChange={(value) =>
                      setEditingCoupon({ ...editingCoupon, discount_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">
                        <span className="flex items-center gap-2">
                          <Percent className="w-4 h-4" /> Percentual
                        </span>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <span className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" /> Valor Fixo
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_value">
                    Valor {editingCoupon.discount_type === 'percent' ? '(%)' : '(R$)'}
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    value={editingCoupon.discount_value || ''}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, discount_value: parseFloat(e.target.value) || 0 })
                    }
                    placeholder={editingCoupon.discount_type === 'percent' ? '10' : '20.00'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_uses">Limite de Usos (Total)</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    value={editingCoupon.max_uses ?? ''}
                    onChange={(e) =>
                      setEditingCoupon({ 
                        ...editingCoupon, 
                        max_uses: e.target.value ? parseInt(e.target.value) : null 
                      })
                    }
                    placeholder="Sem limite"
                  />
                  <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_uses_per_customer">Usos por Cliente</Label>
                  <Input
                    id="max_uses_per_customer"
                    type="number"
                    value={editingCoupon.max_uses_per_customer || 1}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, max_uses_per_customer: parseInt(e.target.value) || 1 })
                    }
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_order_value">Pedido Mínimo (R$)</Label>
                <Input
                  id="min_order_value"
                  type="number"
                  value={editingCoupon.min_order_value || ''}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, min_order_value: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Válido Até</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={editingCoupon.valid_until?.split('T')[0] || ''}
                  onChange={(e) =>
                    setEditingCoupon({ 
                      ...editingCoupon, 
                      valid_until: e.target.value ? `${e.target.value}T23:59:59Z` : null 
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Deixe vazio para sem data limite</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Interno)</Label>
                <Input
                  id="description"
                  value={editingCoupon.description || ''}
                  onChange={(e) =>
                    setEditingCoupon({ ...editingCoupon, description: e.target.value })
                  }
                  placeholder="Campanha de lançamento"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingCoupon(null); setIsCreatingCoupon(false); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCoupon} disabled={savingCoupon}>
              {savingCoupon ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isCreatingCoupon ? 'Criar Cupom' : 'Salvar'}
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
