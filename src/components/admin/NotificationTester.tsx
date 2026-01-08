import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, MessageCircle, TestTube, Loader2, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NotificationTester = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [isTestingTextFallback, setIsTestingTextFallback] = useState(false);
  const [emailResult, setEmailResult] = useState<'success' | 'error' | null>(null);
  const [whatsappResult, setWhatsappResult] = useState<'success' | 'error' | 'warning' | null>(null);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);

  // Mock order data for testing
  const mockOrderData = {
    order_number: "DJA-TEST",
    customer_name: "Cliente Teste",
    items: [
      {
        name: "Kit 7 Dias Detox",
        quantity: 1,
        totalPrice: 189.90,
        type: "kit",
        flavors: [
          { name: "Suco Verde Detox", quantity: 7 },
          { name: "Sopa Emagrecedora", quantity: 7 }
        ]
      }
    ],
    subtotal: 189.90,
    delivery_fee: 0,
    total: 189.90,
    delivery_option: "retirada",
    delivery_address: null,
    payment_method: "pix"
  };

  const testEmail = async () => {
    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Digite um email para testar",
        variant: "destructive"
      });
      return;
    }

    setIsTestingEmail(true);
    setEmailResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-order-approved', {
        body: {
          ...mockOrderData,
          customer_email: email,
          customer_name: "Cliente Teste",
          customer_phone: phone || "11999999999"
        }
      });

      if (error) throw error;

      console.log('📧 Email test result:', data);
      setEmailResult('success');
      toast({
        title: "✅ Email enviado!",
        description: `Email de teste enviado para ${email}`,
      });
    } catch (error: any) {
      console.error('Email test error:', error);
      setEmailResult('error');
      toast({
        title: "❌ Erro no email",
        description: error.message || "Falha ao enviar email de teste",
        variant: "destructive"
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const testWhatsApp = async () => {
    if (!phone) {
      toast({
        title: "Telefone obrigatório",
        description: "Digite um número de WhatsApp para testar",
        variant: "destructive"
      });
      return;
    }

    setIsTestingWhatsApp(true);
    setWhatsappResult(null);
    setLastApiResponse(null);

    try {
      // Create a temporary test order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: "TESTE - Ignorar",
          customer_email: email || "teste@teste.com",
          customer_phone: phone,
          items: mockOrderData.items,
          subtotal: mockOrderData.subtotal,
          delivery_fee: 0,
          total: mockOrderData.total,
          delivery_option: "retirada",
          status: "approved",
          payment_method: "test"
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Send WhatsApp notification using template
      const { data, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: { 
          order_id: orderData.id, 
          status: 'approved' 
        }
      });

      if (error) throw error;

      console.log('📱 WhatsApp test result:', data);
      setLastApiResponse(data);

      // Delete the test order
      await supabase.from('orders').delete().eq('id', orderData.id);

      // API returned 200 but message may not have arrived
      setWhatsappResult('warning');
      toast({
        title: "⚠️ API aceitou a requisição",
        description: (
          <div className="text-xs space-y-1">
            <p>A API NotificaMe retornou sucesso (200).</p>
            <p className="text-muted-foreground">
              Verifique se a mensagem chegou. Se não chegou, o template pode não estar aprovado pela Meta.
            </p>
          </div>
        ),
      });
    } catch (error: any) {
      console.error('WhatsApp test error:', error);
      setWhatsappResult('error');
      setLastApiResponse({ error: error.message });
      toast({
        title: "❌ Erro no WhatsApp",
        description: error.message || "Falha ao enviar WhatsApp de teste",
        variant: "destructive"
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  const testWhatsAppTextFallback = async () => {
    if (!phone) {
      toast({
        title: "Telefone obrigatório",
        description: "Digite um número de WhatsApp para testar",
        variant: "destructive"
      });
      return;
    }

    setIsTestingTextFallback(true);
    setWhatsappResult(null);
    setLastApiResponse(null);

    try {
      // Create a temporary test order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: "TESTE - Ignorar",
          customer_email: email || "teste@teste.com",
          customer_phone: phone,
          items: mockOrderData.items,
          subtotal: mockOrderData.subtotal,
          delivery_fee: 0,
          total: mockOrderData.total,
          delivery_option: "retirada",
          status: "pending",
          payment_method: "test"
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Send WhatsApp using whatsapp_pending status (uses text message fallback)
      const { data, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: { 
          order_id: orderData.id, 
          status: 'whatsapp_pending' 
        }
      });

      if (error) throw error;

      console.log('📱 WhatsApp text fallback test result:', data);
      setLastApiResponse(data);

      // Delete the test order
      await supabase.from('orders').delete().eq('id', orderData.id);

      setWhatsappResult('warning');
      toast({
        title: "⚠️ Mensagem de texto enviada",
        description: (
          <div className="text-xs space-y-1">
            <p>Foi enviada uma mensagem de texto simples.</p>
            <p className="text-muted-foreground">
              Só funciona se você iniciou conversa com o número nos últimos 24h.
            </p>
          </div>
        ),
      });
    } catch (error: any) {
      console.error('WhatsApp text fallback error:', error);
      setWhatsappResult('error');
      setLastApiResponse({ error: error.message });
      toast({
        title: "❌ Erro no WhatsApp",
        description: error.message || "Falha ao enviar mensagem de texto",
        variant: "destructive"
      });
    } finally {
      setIsTestingTextFallback(false);
    }
  };

  const getResultIcon = (result: 'success' | 'error' | 'warning' | null, isLoading: boolean) => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (result === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (result === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
    if (result === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return null;
  };

  return (
    <Card className="border-dashed border-2 border-amber-300 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TestTube className="h-5 w-5 text-amber-600" />
          Testar Notificações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            <strong>Sobre templates WhatsApp:</strong>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li>Templates precisam ser aprovados pela Meta (24-48h)</li>
              <li>Mensagens de texto só funcionam na janela de 24h após contato</li>
              <li>Verifique o status do template no painel NotificaMe</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-phone">WhatsApp (DDD + número)</Label>
            <Input
              id="test-phone"
              type="tel"
              placeholder="11999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={11}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testEmail}
            disabled={isTestingEmail || !email}
            className="gap-2"
          >
            {isTestingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : emailResult === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : emailResult === 'error' ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Testar Email
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={testWhatsApp}
            disabled={isTestingWhatsApp || !phone}
            className="gap-2"
          >
            {getResultIcon(whatsappResult, isTestingWhatsApp) || <MessageCircle className="h-4 w-4" />}
            Template WhatsApp
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={testWhatsAppTextFallback}
            disabled={isTestingTextFallback || !phone}
            className="gap-2 border-dashed"
          >
            {isTestingTextFallback ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Texto Simples (24h)
          </Button>
        </div>

        {lastApiResponse && (
          <div className="mt-3 p-3 bg-muted/50 rounded-md">
            <p className="text-xs font-medium mb-1">Última resposta da API:</p>
            <pre className="text-xs text-muted-foreground overflow-x-auto max-h-32">
              {JSON.stringify(lastApiResponse, null, 2)}
            </pre>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          💡 Se o template não funcionar, verifique se está <strong>APROVADO</strong> no NotificaMe Hub.
          O texto simples só funciona se o cliente iniciou conversa nas últimas 24h.
        </p>
      </CardContent>
    </Card>
  );
};

export default NotificationTester;
