import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageCircle, CheckCircle2, Clock, Sparkles, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DietRequest {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  goal: string;
  preferences: string | null;
  photo_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  contacted: { label: "Contactado", color: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Em Andamento", color: "bg-purple-100 text-purple-800" },
  done: { label: "Finalizado", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-800" },
};

const goalLabels: Record<string, string> = {
  emagrecer: "🔥 Emagrecer",
  "ganhar-massa": "💪 Ganhar Massa",
  manter: "⚖️ Manter Peso",
};

const DietRequestsManager = () => {
  const [requests, setRequests] = useState<DietRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("diet_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRequests(data as DietRequest[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("diet_requests").update({ status }).eq("id", id);
    if (error) {
      toast("Erro ao atualizar status");
    } else {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast("Status atualizado");
    }
  };

  const saveNotes = async (id: string) => {
    const { error } = await supabase.from("diet_requests").update({ admin_notes: editNotes }).eq("id", id);
    if (!error) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, admin_notes: editNotes } : r));
      setEditingId(null);
      toast("Anotação salva");
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const msg = `Olá ${name}! Recebemos seu pedido de Dieta Personalizada 🥗\n\nVou entender melhor seus objetivos e preparar um plano sob medida para você.\n\nPode me contar um pouco mais sobre o que está buscando?`;
    window.open(`https://wa.me/55${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const filtered = requests.filter(r => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.customer_name.toLowerCase().includes(q) || r.customer_phone.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Solicitações de Dieta</h2>
          <p className="text-sm text-muted-foreground">
            {requests.filter(r => r.status === "pending").length} pendentes · {requests.length} total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          Atualizar
        </Button>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="contacted">Contactadas</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="done">Finalizadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {requests.length === 0 ? "Nenhuma solicitação recebida ainda" : "Nenhuma solicitação encontrada com esse filtro"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{req.customer_name}</span>
                      <Select value={req.status} onValueChange={(v) => updateStatus(req.id, v)}>
                        <SelectTrigger className={`h-6 w-fit px-2 text-xs border-0 ${statusConfig[req.status]?.color || ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="contacted">Contactado</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="done">Finalizado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {req.customer_phone}{req.customer_email ? ` · ${req.customer_email}` : ""} · {goalLabels[req.goal] || req.goal}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleString("pt-BR")}
                    </p>
                    {req.photo_url && (
                      <details className="mt-2">
                        <summary className="text-xs text-primary cursor-pointer hover:underline">📸 Ver foto anexada</summary>
                        <img src={req.photo_url} alt="Dieta do cliente" className="mt-2 max-h-48 rounded-lg border" />
                      </details>
                    )}
                    {req.preferences && (
                      <p className="text-sm mt-2 text-muted-foreground bg-muted/50 rounded p-2 whitespace-pre-wrap">
                        {req.preferences}
                      </p>
                    )}
                    {editingId === req.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Anotações do admin..." className="min-h-[60px] text-sm" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNotes(req.id)}>Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        {req.admin_notes && (
                          <p className="text-xs text-muted-foreground italic">📝 {req.admin_notes}</p>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setEditingId(req.id); setEditNotes(req.admin_notes || ""); }}>
                          {req.admin_notes ? "Editar" : "Adicionar anotação"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => openWhatsApp(req.customer_phone, req.customer_name)}>
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DietRequestsManager;