import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Star,
  Link2,
  Copy,
  Printer,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Plus,
  ExternalLink,
  Eye,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/contexts/TenantContext";

interface FeedbackToken {
  id: string;
  recurring_customer_id: string;
  token: string;
  customer_name: string;
  customer_phone: string;
  is_active: boolean;
  created_at: string;
}

interface Feedback {
  id: string;
  rating: number;
  liked_items: string | null;
  disliked_items: string | null;
  observations: string | null;
  photo_urls: string[];
  week_reference: string | null;
  created_at: string;
}

interface RecurringCustomer {
  id: string;
  customer_name: string;
  customer_phone: string;
}

const ClientFeedbackManager = () => {
  const { tenant } = useTenant();
  const [tokens, setTokens] = useState<FeedbackToken[]>([]);
  const [recurringCustomers, setRecurringCustomers] = useState<RecurringCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [feedbacksMap, setFeedbacksMap] = useState<Record<string, Feedback[]>>({});
  const [loadingFeedbacks, setLoadingFeedbacks] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: tokensData }, { data: customersData }] = await Promise.all([
      supabase.from("client_feedback_tokens").select("*").order("created_at", { ascending: false }),
      supabase.from("recurring_customers").select("id, customer_name, customer_phone").eq("is_active", true).order("customer_name"),
    ]);
    setTokens(tokensData || []);
    setRecurringCustomers(customersData || []);
    setLoading(false);
  };

  // Customers that don't have a token yet
  const availableCustomers = useMemo(() => {
    const tokenCustomerIds = new Set(tokens.map((t) => t.recurring_customer_id));
    return recurringCustomers.filter((c) => !tokenCustomerIds.has(c.id));
  }, [tokens, recurringCustomers]);

  const generateToken = async () => {
    if (!selectedCustomerId) return;
    const customer = recurringCustomers.find((c) => c.id === selectedCustomerId);
    if (!customer) return;

    setGenerating(true);
    try {
      const { error } = await supabase.from("client_feedback_tokens").insert({
        recurring_customer_id: customer.id,
        customer_name: customer.customer_name,
        customer_phone: customer.customer_phone,
        tenant_id: tenant?.id || "00000000-0000-0000-0000-000000000001",
      });
      if (error) throw error;

      toast({ title: "Link gerado com sucesso!" });
      setSelectedCustomerId("");
      fetchData();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const getFeedbackLink = (token: string) => {
    const baseUrl = tenant?.domain
      ? `https://${tenant.domain}`
      : window.location.origin;
    return `${baseUrl}/feedback/${token}`;
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getFeedbackLink(token));
    toast({ title: "Link copiado!" });
  };

  const shareWhatsApp = (token: FeedbackToken) => {
    const link = getFeedbackLink(token.token);
    const firstName = token.customer_name.split(" ")[0];
    const message = encodeURIComponent(
      `Olá ${firstName}! 😊\n\nComo foi sua semana com nossas refeições? Seu feedback é muito importante para nós melhorarmos cada vez mais!\n\nAcesse o link abaixo para avaliar:\n${link}`
    );
    const phone = token.customer_phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const loadFeedbacks = async (tokenId: string) => {
    if (expandedToken === tokenId) {
      setExpandedToken(null);
      return;
    }

    setLoadingFeedbacks(tokenId);
    setExpandedToken(tokenId);

    const { data } = await supabase
      .from("client_feedbacks")
      .select("*")
      .eq("token_id", tokenId)
      .order("created_at", { ascending: false });

    setFeedbacksMap((prev) => ({ ...prev, [tokenId]: (data || []) as Feedback[] }));
    setLoadingFeedbacks(null);
  };

  // Build preferences summary from all feedbacks
  const buildSummary = (feedbacks: Feedback[]) => {
    const allLiked: string[] = [];
    const allDisliked: string[] = [];
    const allObs: string[] = [];
    const avgRating =
      feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
        : "0";

    feedbacks.forEach((f) => {
      if (f.liked_items) allLiked.push(f.liked_items);
      if (f.disliked_items) allDisliked.push(f.disliked_items);
      if (f.observations) allObs.push(f.observations);
    });

    return { avgRating, allLiked, allDisliked, allObs, total: feedbacks.length };
  };

  const copySummaryToClipboard = (token: FeedbackToken, feedbacks: Feedback[]) => {
    const summary = buildSummary(feedbacks);
    const text = `📋 RESUMO — ${token.customer_name}
⭐ Nota média: ${summary.avgRating}/5 (${summary.total} feedbacks)

✅ O QUE GOSTA:
${summary.allLiked.length > 0 ? summary.allLiked.map((l) => `• ${l}`).join("\n") : "Nenhum registro"}

❌ O QUE NÃO GOSTA:
${summary.allDisliked.length > 0 ? summary.allDisliked.map((d) => `• ${d}`).join("\n") : "Nenhum registro"}

📝 OBSERVAÇÕES:
${summary.allObs.length > 0 ? summary.allObs.map((o) => `• ${o}`).join("\n") : "Nenhuma"}`;

    navigator.clipboard.writeText(text);
    toast({ title: "Resumo copiado!" });
  };

  const printSummary = (token: FeedbackToken, feedbacks: Feedback[]) => {
    const summary = buildSummary(feedbacks);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Feedback ${token.customer_name}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 6mm 4mm; font-size: 13px; font-weight: bold; line-height: 1.3; color: #000; }
  .divider { border-top: 2px dashed #000; margin: 6px 0; }
  .center { text-align: center; }
  .big { font-size: 18px; font-weight: bold; }
  @media print { body { width: 80mm; padding: 2mm 3mm; } }
</style></head><body>

<div class="center">
  <div style="font-size:16px;font-weight:bold;letter-spacing:2px;">${(tenant?.brand_name || "DIETA JÁ").toUpperCase()}</div>
  <div class="divider"></div>
  <div class="big">📋 FICHA DO CLIENTE</div>
</div>
<div class="divider"></div>

<div>
  <div style="font-size:16px;font-weight:bold;">👤 ${token.customer_name}</div>
  <div style="font-size:12px;">📱 ${token.customer_phone}</div>
  <div style="font-size:12px;">⭐ Nota média: ${summary.avgRating}/5 (${summary.total} avaliações)</div>
</div>

<div class="divider"></div>

<div>
  <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">✅ O QUE GOSTA:</div>
  ${summary.allLiked.length > 0 ? summary.allLiked.map((l) => `<div style="font-size:12px;padding:2px 0;">• ${l}</div>`).join("") : '<div style="font-size:12px;color:#888;">Nenhum registro</div>'}
</div>

<div class="divider"></div>

<div>
  <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">❌ O QUE NÃO GOSTA:</div>
  ${summary.allDisliked.length > 0 ? summary.allDisliked.map((d) => `<div style="font-size:12px;padding:2px 0;">• ${d}</div>`).join("") : '<div style="font-size:12px;color:#888;">Nenhum registro</div>'}
</div>

<div class="divider"></div>

<div>
  <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">📝 OBSERVAÇÕES:</div>
  ${summary.allObs.length > 0 ? summary.allObs.map((o) => `<div style="font-size:12px;padding:2px 0;">• ${o}</div>`).join("") : '<div style="font-size:12px;color:#888;">Nenhuma</div>'}
</div>

<div class="divider"></div>
<div class="center" style="font-size:10px;color:#888;margin-top:8px;">
  Gerado em ${new Date().toLocaleDateString("pt-BR")} — ${(tenant?.brand_name || "Dieta Já")}
</div>

</body></html>`;

    const w = window.open("", "_blank", "width=320,height=600");
    if (!w) { alert("Habilite pop-ups para imprimir."); return; }
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feedback Mensalistas</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie links de feedback e acompanhe preferências dos clientes
          </p>
        </div>
      </div>

      {/* Generate new token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Gerar Link de Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Cliente Recorrente</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.customer_name} — {c.customer_phone}
                    </SelectItem>
                  ))}
                  {availableCustomers.length === 0 && (
                    <SelectItem value="__none" disabled>
                      Todos já possuem link
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateToken} disabled={!selectedCustomerId || generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Gerar Link
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tokens list */}
      <div className="space-y-3">
        {tokens.map((token) => {
          const isExpanded = expandedToken === token.id;
          const feedbacks = feedbacksMap[token.id] || [];
          const hasFeedbacks = feedbacks.length > 0;

          return (
            <Card key={token.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{token.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">{token.customer_phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(token.token)} title="Copiar link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => shareWhatsApp(token)} title="Enviar WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getFeedbackLink(token.token), "_blank")}
                      title="Abrir página"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={isExpanded ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadFeedbacks(token.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-border pt-4">
                    {loadingFeedbacks === token.id ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    ) : !hasFeedbacks ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum feedback recebido ainda
                      </p>
                    ) : (
                      <>
                        {/* Action buttons */}
                        <div className="flex gap-2 mb-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copySummaryToClipboard(token, feedbacks)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copiar Resumo
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = getFeedbackLink(token.token);
                              const summary = buildSummary(feedbacks);
                              const text = encodeURIComponent(
                                `📋 *${token.customer_name}*\n⭐ Nota: ${summary.avgRating}/5\n\n✅ Gosta: ${summary.allLiked.join(", ") || "—"}\n❌ Não gosta: ${summary.allDisliked.join(", ") || "—"}\n📝 Obs: ${summary.allObs.join(", ") || "—"}`
                              );
                              window.open(`https://wa.me/?text=${text}`, "_blank");
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => printSummary(token, feedbacks)}
                          >
                            <Printer className="h-4 w-4 mr-1" />
                            Imprimir i9
                          </Button>
                        </div>

                        {/* Summary */}
                        {(() => {
                          const summary = buildSummary(feedbacks);
                          return (
                            <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm">
                              <div className="font-semibold mb-2">
                                ⭐ Nota média: {summary.avgRating}/5 ({summary.total} feedbacks)
                              </div>
                              {summary.allDisliked.length > 0 && (
                                <div className="mb-1">
                                  <span className="font-medium text-destructive">❌ Não gosta:</span>{" "}
                                  {summary.allDisliked.join(" | ")}
                                </div>
                              )}
                              {summary.allLiked.length > 0 && (
                                <div>
                                  <span className="font-medium text-green-600">✅ Gosta:</span>{" "}
                                  {summary.allLiked.join(" | ")}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Individual feedbacks */}
                        <div className="space-y-3">
                          {feedbacks.map((fb) => (
                            <div key={fb.id} className="border border-border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`h-4 w-4 ${
                                        s <= fb.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(fb.created_at).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              {fb.liked_items && (
                                <p className="text-sm mb-1">
                                  <ThumbsUp className="h-3.5 w-3.5 inline text-green-500 mr-1" />
                                  {fb.liked_items}
                                </p>
                              )}
                              {fb.disliked_items && (
                                <p className="text-sm mb-1">
                                  <ThumbsDown className="h-3.5 w-3.5 inline text-destructive mr-1" />
                                  {fb.disliked_items}
                                </p>
                              )}
                              {fb.observations && (
                                <p className="text-sm text-muted-foreground">{fb.observations}</p>
                              )}
                              {fb.photo_urls && fb.photo_urls.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {fb.photo_urls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={url}
                                        alt=""
                                        className="w-16 h-16 rounded-lg object-cover border border-border"
                                      />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {tokens.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                Nenhum link de feedback gerado ainda. Selecione um cliente recorrente acima para começar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientFeedbackManager;
