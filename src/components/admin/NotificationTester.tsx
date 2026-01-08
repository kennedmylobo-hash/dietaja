import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, MessageCircle, TestTube, Loader2, CheckCircle, XCircle, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const NotificationTester = () => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [isTestingTemplate1, setIsTestingTemplate1] = useState(false);
  const [isTestingTemplate2, setIsTestingTemplate2] = useState(false);
  const [emailResult, setEmailResult] = useState<'success' | 'error' | null>(null);
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);
  const [templateResults, setTemplateResults] = useState<{
    compra_confirmada: 'success' | 'error' | 'pending' | null;
    pix_pendente: 'success' | 'error' | 'pending' | null;
  }>({ compra_confirmada: null, pix_pendente: null });

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

  const testSingleTemplate = async (templateType: 'compra_confirmada' | 'pix_pendente') => {
    if (!phone) {
      toast({
        title: "Telefone obrigatório",
        description: "Digite um número de WhatsApp para testar",
        variant: "destructive"
      });
      return;
    }

    const isCompraConfirmada = templateType === 'compra_confirmada';
    const setLoading = isCompraConfirmada ? setIsTestingTemplate1 : setIsTestingTemplate2;
    
    setLoading(true);
    setLastApiResponse(null);
    setTemplateResults(prev => ({ ...prev, [templateType]: 'pending' }));

    try {
      const orderData = {
        customer_name: `TESTE ${isCompraConfirmada ? 'Compra Confirmada' : 'PIX Pendente'}`,
        customer_email: email || "teste@teste.com",
        customer_phone: phone,
        items: mockOrderData.items,
        subtotal: mockOrderData.subtotal,
        delivery_fee: 0,
        total: mockOrderData.total,
        delivery_option: "retirada",
        status: isCompraConfirmada ? "approved" : "pending",
        payment_method: isCompraConfirmada ? "test" : "pix"
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      const invokeBody = isCompraConfirmada 
        ? { order_id: order.id, status: 'approved' }
        : { 
            order_id: order.id, 
            status: 'pending',
            pix_code: '00020126580014br.gov.bcb.pix0136teste-pix-exemplo-dietaja520400005303986540510.005802BR5925DIETA JA6009SAO PAULO62070503***6304TEST'
          };

      const { data: result, error } = await supabase.functions.invoke('send-order-whatsapp', {
        body: invokeBody
      });

      setTemplateResults(prev => ({ 
        ...prev, 
        [templateType]: error ? 'error' : 'success' 
      }));

      setLastApiResponse({ 
        template: isCompraConfirmada ? 'compra_confirmada_dieta' : 'pix_pendente_dietaja', 
        success: !error,
        response: result || error 
      });

      await supabase.from('orders').delete().eq('id', order.id);

      toast({
        title: `📱 ${isCompraConfirmada ? 'Compra Confirmada' : 'PIX Pendente'} enviado!`,
        description: "Verifique se a mensagem chegou no WhatsApp",
      });

    } catch (error: any) {
      console.error('WhatsApp test error:', error);
      setTemplateResults(prev => ({ ...prev, [templateType]: 'error' }));
      setLastApiResponse({ error: error.message });
      toast({
        title: "❌ Erro no teste",
        description: error.message || "Falha ao testar template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testBothTemplates = async () => {
    if (!phone) {
      toast({
        title: "Telefone obrigatório",
        description: "Digite um número de WhatsApp para testar",
        variant: "destructive"
      });
      return;
    }

    setIsTestingWhatsApp(true);
    setLastApiResponse(null);
    setTemplateResults({ compra_confirmada: 'pending', pix_pendente: 'pending' });

    const results: any[] = [];

    try {
      // TESTE 1: Template compra_confirmada_dieta (status: approved)
      const { data: order1, error: orderError1 } = await supabase
        .from('orders')
        .insert({
          customer_name: "TESTE Template 1",
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

      if (orderError1) throw orderError1;

      const { data: result1, error: error1 } = await supabase.functions.invoke('send-order-whatsapp', {
        body: { order_id: order1.id, status: 'approved' }
      });

      results.push({ 
        template: 'compra_confirmada_dieta', 
        success: !error1,
        response: result1 || error1 
      });
      
      setTemplateResults(prev => ({ 
        ...prev, 
        compra_confirmada: error1 ? 'error' : 'success' 
      }));

      await supabase.from('orders').delete().eq('id', order1.id);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // TESTE 2: Template pix_pendente_dietaja (status: pending com pix_code)
      const { data: order2, error: orderError2 } = await supabase
        .from('orders')
        .insert({
          customer_name: "TESTE Template 2",
          customer_email: email || "teste@teste.com",
          customer_phone: phone,
          items: mockOrderData.items,
          subtotal: mockOrderData.subtotal,
          delivery_fee: 0,
          total: mockOrderData.total,
          delivery_option: "retirada",
          status: "pending",
          payment_method: "pix"
        })
        .select()
        .single();

      if (orderError2) throw orderError2;

      const { data: result2, error: error2 } = await supabase.functions.invoke('send-order-whatsapp', {
        body: { 
          order_id: order2.id, 
          status: 'pending',
          pix_code: '00020126580014br.gov.bcb.pix0136teste-pix-exemplo-dietaja520400005303986540510.005802BR5925DIETA JA6009SAO PAULO62070503***6304TEST'
        }
      });

      results.push({ 
        template: 'pix_pendente_dietaja', 
        success: !error2,
        response: result2 || error2 
      });

      setTemplateResults(prev => ({ 
        ...prev, 
        pix_pendente: error2 ? 'error' : 'success' 
      }));

      await supabase.from('orders').delete().eq('id', order2.id);

      setLastApiResponse(results);

      toast({
        title: "📱 2 Templates enviados!",
        description: "Verifique se as 2 mensagens chegaram no WhatsApp",
      });

    } catch (error: any) {
      console.error('WhatsApp test error:', error);
      setLastApiResponse({ error: error.message, results });
      toast({
        title: "❌ Erro no teste",
        description: error.message || "Falha ao testar templates",
        variant: "destructive"
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  const getTemplateIcon = (status: 'success' | 'error' | 'pending' | null) => {
    if (status === 'pending') return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    if (status === 'success') return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (status === 'error') return <XCircle className="h-3 w-3 text-red-500" />;
    return <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />;
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
            <strong>Templates aprovados pela Meta:</strong>
            <ul className="mt-1 list-disc list-inside space-y-0.5">
              <li><code className="bg-blue-100 px-1 rounded">compra_confirmada_dieta</code> - Pedido aprovado</li>
              <li><code className="bg-blue-100 px-1 rounded">pix_pendente_dietaja</code> - PIX pendente</li>
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
            onClick={() => testSingleTemplate('compra_confirmada')}
            disabled={isTestingTemplate1 || isTestingWhatsApp || !phone}
            className="gap-2"
          >
            {isTestingTemplate1 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : templateResults.compra_confirmada === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : templateResults.compra_confirmada === 'error' ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Compra Confirmada
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => testSingleTemplate('pix_pendente')}
            disabled={isTestingTemplate2 || isTestingWhatsApp || !phone}
            className="gap-2"
          >
            {isTestingTemplate2 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : templateResults.pix_pendente === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : templateResults.pix_pendente === 'error' ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            PIX Pendente
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={testBothTemplates}
            disabled={isTestingWhatsApp || isTestingTemplate1 || isTestingTemplate2 || !phone}
            className="gap-2"
          >
            {isTestingWhatsApp ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Testar 2 Templates
          </Button>
        </div>

        {/* Template status indicators */}
        {(templateResults.compra_confirmada || templateResults.pix_pendente) && (
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {getTemplateIcon(templateResults.compra_confirmada)}
              <span>compra_confirmada_dieta</span>
            </div>
            <div className="flex items-center gap-1.5">
              {getTemplateIcon(templateResults.pix_pendente)}
              <span>pix_pendente_dietaja</span>
            </div>
          </div>
        )}

        {lastApiResponse && (
          <div className="mt-3 p-3 bg-muted/50 rounded-md">
            <p className="text-xs font-medium mb-1">Resultado dos testes:</p>
            <pre className="text-xs text-muted-foreground overflow-x-auto max-h-40">
              {JSON.stringify(lastApiResponse, null, 2)}
            </pre>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          💡 Ao clicar em "Testar 2 Templates", serão enviadas 2 mensagens WhatsApp usando os templates aprovados pela Meta.
        </p>
      </CardContent>
    </Card>
  );
};

export default NotificationTester;