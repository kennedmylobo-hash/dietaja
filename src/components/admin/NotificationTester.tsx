import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, MessageCircle, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NotificationTester = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [emailResult, setEmailResult] = useState<'success' | 'error' | null>(null);
  const [whatsappResult, setWhatsappResult] = useState<'success' | 'error' | null>(null);

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

    try {
      // First, create a temporary test order to get a valid order_id
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

      // Send WhatsApp notification
      const { data, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: { 
          order_id: orderData.id, 
          status: 'approved' 
        }
      });

      if (error) throw error;

      console.log('📱 WhatsApp test result:', data);

      // Delete the test order
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderData.id);

      setWhatsappResult('success');
      toast({
        title: "✅ WhatsApp enviado!",
        description: `Mensagem de teste enviada para ${phone}`,
      });
    } catch (error: any) {
      console.error('WhatsApp test error:', error);
      setWhatsappResult('error');
      toast({
        title: "❌ Erro no WhatsApp",
        description: error.message || "Falha ao enviar WhatsApp de teste",
        variant: "destructive"
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  const testBoth = async () => {
    await testEmail();
    await testWhatsApp();
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
        <p className="text-sm text-muted-foreground">
          Teste o envio de email e WhatsApp sem criar pedidos reais.
        </p>

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
            {isTestingWhatsApp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : whatsappResult === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : whatsappResult === 'error' ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Testar WhatsApp
          </Button>

          <Button
            size="sm"
            onClick={testBoth}
            disabled={isTestingEmail || isTestingWhatsApp || (!email && !phone)}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <TestTube className="h-4 w-4" />
            Testar Ambos
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 O teste de WhatsApp cria um pedido temporário (deletado após o envio) para usar o template aprovado.
        </p>
      </CardContent>
    </Card>
  );
};

export default NotificationTester;
