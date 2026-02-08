import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Search, 
  AlertCircle, 
  CheckCircle,
  Plus,
  Minus,
  User,
  Phone,
  MapPin,
  Loader2,
  Trash2,
  Calendar,
  Clock,
  CreditCard,
  Utensils,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  parseWhatsAppConversation, 
  buildCatalog, 
  ParsedOrder, 
  ParsedOrderItem 
} from "@/lib/whatsapp-parser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenantId } from "@/hooks/useTenantId";

interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
}

interface MarmitaPackage {
  id: string;
  name: string;
  unit_price: number;
  line_type: string | null;
  quantity: number;
}

type Step = 'input' | 'review';

const MISSING_FIELD_LABELS: Record<string, string> = {
  name: 'Nome do cliente',
  items: 'Itens do pedido (pelo menos 1)',
  lineType: 'Tipo do pedido (FIT ou FITNESS)',
  deliveryDate: 'Data da entrega',
  deliveryTime: 'Horário da entrega',
  subtotal: 'Valor total do pedido (> 0)',
  paymentStatus: 'Status do pagamento (pago ou a receber)',
};

const WhatsAppOrderImporter = () => {
  const tenantId = useTenantId();
  const [conversationText, setConversationText] = useState("");
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<Step>('input');
  
  // Catalog data
  const [marmitaFlavors, setMarmitaFlavors] = useState<MarmitaFlavor[]>([]);
  const [marmitaPackages, setMarmitaPackages] = useState<MarmitaPackage[]>([]);

  // Editable form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<'delivery' | 'pickup'>('delivery');
  const [items, setItems] = useState<ParsedOrderItem[]>([]);

  // New required fields
  const [lineType, setLineType] = useState<'fit' | 'fitness' | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending_payment' | null>(null);

  useEffect(() => {
    fetchCatalogData();
  }, []);

  // Recalculate item prices when lineType changes
  useEffect(() => {
    if (!lineType || items.length === 0 || marmitaPackages.length === 0) return;

    const lineTypeKey = lineType === 'fit' ? 'emagrecimento' : 'hipertrofia';
    // Find the cheapest package for this line to get unit_price
    const matchingPackages = marmitaPackages.filter(p => {
      const name = p.name.toLowerCase();
      if (lineTypeKey === 'hipertrofia') return name.includes('fitness') || name.includes('hipertrofia');
      return !name.includes('fitness') && !name.includes('hipertrofia');
    });
    
    // Use first matching package's unit_price, or fallback
    const unitPrice = matchingPackages.length > 0 
      ? matchingPackages.reduce((max, p) => Math.max(max, p.unit_price), 0)
      : 0;

    setItems(prev => prev.map(item => ({
      ...item,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    })));
  }, [lineType, marmitaPackages.length]);

  const fetchCatalogData = async () => {
    try {
      const [flavorsRes, packagesRes] = await Promise.all([
        supabase.from('marmita_flavors').select('id, name, category').eq('active', true).eq('tenant_id', tenantId),
        supabase.from('marmita_packages').select('id, name, unit_price, line_type, quantity').eq('active', true).eq('tenant_id', tenantId),
      ]);

      if (flavorsRes.data) setMarmitaFlavors(flavorsRes.data);
      if (packagesRes.data) setMarmitaPackages(packagesRes.data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
    }
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items]);

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!customerName.trim()) missing.push('name');
    if (items.length === 0) missing.push('items');
    if (!lineType) missing.push('lineType');
    if (!deliveryDate) missing.push('deliveryDate');
    if (!deliveryTime) missing.push('deliveryTime');
    if (subtotal <= 0) missing.push('subtotal');
    if (!paymentStatus) missing.push('paymentStatus');
    return missing;
  }, [customerName, items, lineType, deliveryDate, deliveryTime, subtotal, paymentStatus]);

  const isComplete = missingFields.length === 0;

  const analyzeConversation = () => {
    if (!conversationText.trim()) {
      toast({
        title: "Erro",
        description: "Cole a conversa do WhatsApp primeiro.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const catalog = buildCatalog(marmitaFlavors);

      const result = parseWhatsAppConversation(conversationText, catalog);
      setParsedOrder(result);

      // Populate editable form
      setCustomerName(result.customer.name || "");
      setCustomerPhone(result.customer.phone || "");
      setCustomerEmail(result.customer.email || "");
      setDeliveryAddress(result.customer.address || "");
      setItems(result.items.map(item => ({
        ...item,
        name: item.name.replace(/mix de salada/gi, 'mix de legumes'),
      })));
      setStep('review');

      toast({
        title: "Análise concluída",
        description: `${result.items.length} item(s) identificado(s). Preencha os campos faltantes.`,
      });
    } catch (error) {
      console.error('Error parsing conversation:', error);
      toast({
        title: "Erro ao analisar",
        description: "Não foi possível processar a conversa.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateItemQuantity = (index: number, delta: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return {
          ...item,
          quantity: newQty,
          totalPrice: item.unitPrice * newQty,
        };
      }
      return item;
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const createOrder = async () => {
    if (!isComplete) return;

    setIsCreating(true);

    try {
      const deliveryFee = deliveryOption === 'delivery' ? 15 : 0;

      const orderItems = items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        type: item.type,
        lineType: lineType,
        flavors: item.type === 'marmita' ? [{
          name: item.name,
          quantity: item.quantity,
          category: 'carnes',
        }] : undefined,
      }));

      const email = customerEmail.trim() || `${customerPhone.replace(/\D/g, '')}@whatsapp.imported`;

      const orderStatus = paymentStatus === 'paid' ? 'approved' : 'whatsapp_pending';

      const { error } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName.trim(),
          customer_phone: customerPhone.replace(/\D/g, ''),
          customer_email: email,
          delivery_option: deliveryOption,
          delivery_address: deliveryOption === 'delivery' ? deliveryAddress : null,
          items: orderItems,
          subtotal,
          delivery_fee: deliveryFee,
          total: subtotal + deliveryFee,
          status: orderStatus,
          payment_method: 'whatsapp',
          paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
          tenant_id: tenantId,
          utm_data: {
            source: 'whatsapp_import',
            scheduled_date: deliveryDate,
            scheduled_time: deliveryTime,
            line_type: lineType,
          },
        });

      if (error) throw error;

      toast({
        title: "✅ Pedido lançado!",
        description: `Pedido de ${customerName} criado como ${paymentStatus === 'paid' ? 'Aprovado' : 'WhatsApp Pendente'}.`,
      });

      // Reset everything
      resetForm();
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Erro ao criar pedido",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setConversationText("");
    setParsedOrder(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setDeliveryAddress("");
    setItems([]);
    setLineType(null);
    setDeliveryDate("");
    setDeliveryTime("");
    setPaymentStatus(null);
    setStep('input');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const isMissing = (field: string) => missingFields.includes(field);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Importar Pedido do WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Cole a conversa, preencha o que faltar, confirme e lance
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📱 Conversa do WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Cole aqui a conversa do WhatsApp com o cliente...

Exemplo:
Olá, quero fazer um pedido:
5 marmitas de carne moída
3 marmitas de frango grelhado
Nome: Maria Silva
WhatsApp: 77991234567"
              className="min-h-[300px] font-mono text-sm"
              value={conversationText}
              onChange={(e) => setConversationText(e.target.value)}
            />
            <Button 
              className="w-full" 
              onClick={analyzeConversation}
              disabled={isAnalyzing || !conversationText.trim()}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analisar Conversa
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Review Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Pedido Extraído</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 'input' && !parsedOrder ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Cole uma conversa e clique em "Analisar" para extrair o pedido</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Missing Fields Alert */}
                {missingFields.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 font-medium text-sm text-destructive-foreground">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Para lançar esse pedido, preciso das seguintes informações:
                    </div>
                    <ul className="pl-6 space-y-0.5">
                      {missingFields.map(field => (
                        <li key={field} className="text-sm text-destructive list-disc">
                          {MISSING_FIELD_LABELS[field]}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" /> Cliente
                  </h4>
                  <div className="grid gap-2">
                    <div>
                      <Label className="text-xs">Nome *</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nome do cliente"
                        className={isMissing('name') ? 'border-destructive' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="77999999999"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Email (opcional)</Label>
                      <Input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Line Type (FIT / FITNESS) */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <Utensils className="w-4 h-4" /> Tipo da Marmita *
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={lineType === 'fit' ? 'default' : 'outline'}
                      className={`w-full ${isMissing('lineType') ? 'border-destructive' : ''}`}
                      onClick={() => setLineType('fit')}
                    >
                      FIT 300g
                    </Button>
                    <Button
                      type="button"
                      variant={lineType === 'fitness' ? 'default' : 'outline'}
                      className={`w-full ${isMissing('lineType') ? 'border-destructive' : ''}`}
                      onClick={() => setLineType('fitness')}
                    >
                      FITNESS 450g
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Delivery Info */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" /> Entrega
                  </h4>
                  
                  <Select 
                    value={deliveryOption} 
                    onValueChange={(v) => setDeliveryOption(v as 'delivery' | 'pickup')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">🛵 Delivery</SelectItem>
                      <SelectItem value="pickup">🏪 Retirada</SelectItem>
                    </SelectContent>
                  </Select>

                  {deliveryOption === 'delivery' && (
                    <Input
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Endereço completo"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Data *
                      </Label>
                      <Input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className={isMissing('deliveryDate') ? 'border-destructive' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Horário *
                      </Label>
                      <Input
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className={isMissing('deliveryTime') ? 'border-destructive' : ''}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">📦 Itens *</h4>
                  
                  {items.length === 0 ? (
                    <p className={`text-sm ${isMissing('items') ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      Nenhum item identificado
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{item.quantity}x {item.name}</span>
                              {item.confidence < 0.8 && (
                                <Badge variant="outline" className="text-xs bg-yellow-50">
                                  ~{Math.round(item.confidence * 100)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateItemQuantity(idx, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-7 text-center font-medium text-sm">{item.quantity}x</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateItemQuantity(idx, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeItem(idx)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Status */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <CreditCard className="w-4 h-4" /> Pagamento *
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={paymentStatus === 'paid' ? 'default' : 'outline'}
                      className={`w-full ${isMissing('paymentStatus') ? 'border-destructive' : ''}`}
                      onClick={() => setPaymentStatus('paid')}
                    >
                      ✅ Pago
                    </Button>
                    <Button
                      type="button"
                      variant={paymentStatus === 'pending_payment' ? 'default' : 'outline'}
                      className={`w-full ${isMissing('paymentStatus') ? 'border-destructive' : ''}`}
                      onClick={() => setPaymentStatus('pending_payment')}
                    >
                      ⏳ A receber
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Subtotal */}
                <div className="flex items-center justify-between font-bold">
                  <span>Valor total:</span>
                  <span className={isMissing('subtotal') ? 'text-destructive' : ''}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {/* Order Summary Card (only when complete) */}
                {isComplete && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-1.5 text-sm">
                    <p className="font-bold text-primary mb-2">📋 Resumo do Pedido</p>
                    <p><strong>Cliente:</strong> {customerName}</p>
                    <p><strong>Pedido:</strong> {items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
                    <p><strong>Tipo:</strong> {lineType === 'fit' ? 'FIT 300g' : 'FITNESS 450g'}</p>
                    <p><strong>Entrega:</strong> {formatDateBR(deliveryDate)} — {deliveryTime}</p>
                    <p><strong>Valor:</strong> {formatCurrency(subtotal)}</p>
                    <p><strong>Pagamento:</strong> {paymentStatus === 'paid' ? 'Pago' : 'A receber'}</p>
                    <p><strong>Financeiro:</strong> Valor lançado</p>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  className="w-full" 
                  onClick={createOrder}
                  disabled={isCreating || !isComplete}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Lançando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isComplete ? 'Posso lançar esse pedido agora?' : 'Preencha todos os campos obrigatórios'}
                    </>
                  )}
                </Button>

                {/* Reset */}
                {parsedOrder && (
                  <Button variant="ghost" className="w-full text-sm" onClick={resetForm}>
                    Limpar e começar novo pedido
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppOrderImporter;
