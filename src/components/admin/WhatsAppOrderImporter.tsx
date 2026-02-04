import { useState, useEffect } from "react";
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
  Edit,
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

interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
}

interface MarmitaPackage {
  id: string;
  name: string;
  unit_price: number;
}

interface KitJuice {
  id: string;
  name: string;
}

interface KitSoup {
  id: string;
  name: string;
}

interface KitPackage {
  id: string;
  name: string;
  price: number;
}

const WhatsAppOrderImporter = () => {
  const [conversationText, setConversationText] = useState("");
  const [parsedOrder, setParsedOrder] = useState<ParsedOrder | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Catalog data
  const [marmitaFlavors, setMarmitaFlavors] = useState<MarmitaFlavor[]>([]);
  const [marmitaPackages, setMarmitaPackages] = useState<MarmitaPackage[]>([]);
  const [kitJuices, setKitJuices] = useState<KitJuice[]>([]);
  const [kitSoups, setKitSoups] = useState<KitSoup[]>([]);
  const [kitPackages, setKitPackages] = useState<KitPackage[]>([]);

  // Editable form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryOption, setDeliveryOption] = useState<'delivery' | 'pickup'>('delivery');
  const [items, setItems] = useState<ParsedOrderItem[]>([]);

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const fetchCatalogData = async () => {
    try {
      const [flavorsRes, packagesRes, juicesRes, soupsRes, kitsRes] = await Promise.all([
        supabase.from('marmita_flavors').select('id, name, category').eq('active', true),
        supabase.from('marmita_packages').select('id, name, unit_price').eq('active', true),
        supabase.from('kit_juices').select('id, name').eq('active', true),
        supabase.from('kit_soups').select('id, name').eq('active', true),
        supabase.from('kit_packages').select('id, name, price').eq('active', true),
      ]);

      if (flavorsRes.data) setMarmitaFlavors(flavorsRes.data);
      if (packagesRes.data) setMarmitaPackages(packagesRes.data);
      if (juicesRes.data) setKitJuices(juicesRes.data);
      if (soupsRes.data) setKitSoups(soupsRes.data);
      if (kitsRes.data) setKitPackages(kitsRes.data);
    } catch (error) {
      console.error('Error fetching catalog:', error);
    }
  };

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
      const catalog = buildCatalog(
        marmitaFlavors,
        marmitaPackages,
        kitJuices,
        kitSoups,
        kitPackages
      );

      const result = parseWhatsAppConversation(conversationText, catalog);
      setParsedOrder(result);

      // Populate editable form
      setCustomerName(result.customer.name || "");
      setCustomerPhone(result.customer.phone || "");
      setCustomerEmail(result.customer.email || "");
      setDeliveryAddress(result.customer.address || "");
      setItems(result.items);

      if (result.warnings.length > 0) {
        toast({
          title: "Atenção",
          description: result.warnings.join(". "),
          variant: "default",
        });
      } else {
        toast({
          title: "Análise concluída!",
          description: `${result.items.length} item(s) identificado(s).`,
        });
      }
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

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const createOrder = async () => {
    // Validation
    if (!customerName.trim()) {
      toast({ title: "Erro", description: "Nome do cliente é obrigatório.", variant: "destructive" });
      return;
    }
    if (!customerPhone.trim()) {
      toast({ title: "Erro", description: "WhatsApp é obrigatório.", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos um item ao pedido.", variant: "destructive" });
      return;
    }
    if (deliveryOption === 'delivery' && !deliveryAddress.trim()) {
      toast({ title: "Erro", description: "Endereço de entrega é obrigatório para delivery.", variant: "destructive" });
      return;
    }

    setIsCreating(true);

    try {
      const subtotal = calculateSubtotal();
      const deliveryFee = deliveryOption === 'delivery' ? 15 : 0; // Default fee

      // Format items for order
      const orderItems = items.map(item => ({
        name: item.matchedName || item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        type: item.type,
        flavors: item.type === 'marmita' ? [{
          name: item.matchedName || item.name,
          quantity: item.quantity,
          category: 'carnes',
        }] : undefined,
      }));

      // Generate default email if not provided
      const email = customerEmail.trim() || `${customerPhone}@whatsapp.imported`;

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
          status: 'whatsapp_pending',
          payment_method: 'whatsapp',
        });

      if (error) throw error;

      toast({
        title: "Pedido criado!",
        description: "O pedido foi registrado como WhatsApp Pendente.",
      });

      // Reset form
      setConversationText("");
      setParsedOrder(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setDeliveryAddress("");
      setItems([]);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
            Cole a conversa e extraia automaticamente os dados do pedido
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
2 sucos verdes
Entrega: Rua das Flores, 123
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

        {/* Extracted Order Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>📋 Pedido Extraído</span>
              {parsedOrder && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isEditing ? 'Visualizar' : 'Editar'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!parsedOrder ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Cole uma conversa e clique em "Analisar" para extrair o pedido</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Warnings */}
                {parsedOrder.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    {parsedOrder.warnings.map((warning, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-yellow-700">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                {/* Customer Info */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4" /> Cliente
                  </h4>
                  
                  <div className="grid gap-3">
                    <div>
                      <Label>Nome</Label>
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nome do cliente"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label>WhatsApp</Label>
                      <Input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="77999999999"
                        disabled={!isEditing}
                      />
                    </div>
                    <div>
                      <Label>Email (opcional)</Label>
                      <Input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Delivery Info */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Entrega
                  </h4>
                  
                  <Select 
                    value={deliveryOption} 
                    onValueChange={(v) => setDeliveryOption(v as 'delivery' | 'pickup')}
                    disabled={!isEditing}
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
                      disabled={!isEditing}
                    />
                  )}
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-3">
                  <h4 className="font-medium">📦 Itens</h4>
                  
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum item identificado</p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{item.matchedName}</span>
                              {item.confidence < 0.8 && (
                                <Badge variant="outline" className="text-xs bg-yellow-50">
                                  ~{Math.round(item.confidence * 100)}%
                                </Badge>
                              )}
                            </div>
                            {item.name !== item.matchedName && (
                              <p className="text-xs text-muted-foreground truncate">
                                Original: {item.name}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isEditing && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateItemQuantity(idx, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <span className="w-8 text-center font-medium">{item.quantity}x</span>
                            {isEditing && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateItemQuantity(idx, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500"
                                  onClick={() => removeItem(idx)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Total & Action */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={createOrder}
                    disabled={isCreating || items.length === 0}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Criar Pedido (WhatsApp Pendente)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WhatsAppOrderImporter;
