import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw, Eye, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentErrorLog {
  id: string;
  order_id: string | null;
  error_code: string | null;
  error_message: string | null;
  provider: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  customer_phone: string | null;
  customer_email: string | null;
  created_at: string;
}

const PaymentErrorLogs = () => {
  const [logs, setLogs] = useState<PaymentErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<PaymentErrorLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLogs(data as PaymentErrorLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getErrorBadge = (errorCode: string | null) => {
    if (!errorCode) return <Badge variant="outline">Desconhecido</Badge>;
    
    const code = parseInt(errorCode);
    if (code >= 500) {
      return <Badge variant="destructive">{errorCode}</Badge>;
    } else if (code >= 400) {
      return <Badge className="bg-orange-500">{errorCode}</Badge>;
    }
    return <Badge variant="secondary">{errorCode}</Badge>;
  };

  const extractErrorDetails = (log: PaymentErrorLog) => {
    const response = log.response_payload as Record<string, unknown> | null;
    if (!response) return null;

    const cause = (response.cause as Array<{ code?: string; description?: string }>) || [];
    const firstCause = cause[0];
    
    return {
      code: firstCause?.code || response.error,
      description: firstCause?.description || response.message,
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Logs de Erros de Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum erro de pagamento registrado. 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Logs de Erros de Pagamento ({logs.length})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const errorDetails = extractErrorDetails(log);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {getErrorBadge(log.error_code)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {errorDetails?.code && (
                        <Badge variant="outline" className="mr-2">
                          {errorDetails.code as string}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {(errorDetails?.description as string) || 'Erro desconhecido'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {log.customer_phone && (
                          <a 
                            href={`https://wa.me/55${log.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {log.customer_phone}
                          </a>
                        )}
                        {log.customer_email && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {log.customer_email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Erro</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Informações Gerais</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><strong>Data:</strong> {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}</div>
                                <div><strong>Código HTTP:</strong> {log.error_code}</div>
                                <div><strong>Provider:</strong> {log.provider}</div>
                                <div><strong>Order ID:</strong> {log.order_id || 'N/A'}</div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Resposta do Mercado Pago</h4>
                              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[200px]">
                                {JSON.stringify(log.response_payload, null, 2)}
                              </pre>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Payload Enviado</h4>
                              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[200px]">
                                {JSON.stringify(log.request_payload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentErrorLogs;
