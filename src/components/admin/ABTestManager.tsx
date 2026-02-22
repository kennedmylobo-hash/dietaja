import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Play, Pause, Trophy, Trash2, FlaskConical } from "lucide-react";
import ABTestReport from "./ABTestReport";

const TARGET_OPTIONS = [
  { value: "hero_title", label: "Hero — Título" },
  { value: "hero_subtitle", label: "Hero — Subtítulo" },
  { value: "hero_cta", label: "Hero — Botão CTA" },
  { value: "hero_title_highlight", label: "Hero — Destaque do título" },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  completed: { label: "Encerrado", variant: "outline" },
};

interface ABTest {
  id: string;
  name: string;
  target_section: string;
  variant_a_value: string;
  variant_b_value: string;
  status: string;
  traffic_split: number;
  winner: string | null;
  created_at: string;
  ended_at: string | null;
}

export default function ABTestManager() {
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [targetSection, setTargetSection] = useState("");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [trafficSplit, setTrafficSplit] = useState(50);

  const { data: tests, isLoading } = useQuery({
    queryKey: ["ab-tests", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ab_tests" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ABTest[];
    },
  });

  const createTest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ab_tests" as any).insert({
        tenant_id: tenantId,
        name,
        target_section: targetSection,
        variant_a_value: variantA,
        variant_b_value: variantB,
        traffic_split: trafficSplit,
        status: "paused",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      toast({ title: "Teste criado!", description: "Ative quando estiver pronto." });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, winner }: { id: string; status: string; winner?: string }) => {
      const update: any = { status };
      if (status === "completed") update.ended_at = new Date().toISOString();
      if (winner) update.winner = winner;

      const { error } = await supabase
        .from("ab_tests" as any)
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const deleteTest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ab_tests" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      toast({ title: "Teste removido" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setName("");
    setTargetSection("");
    setVariantA("");
    setVariantB("");
    setTrafficSplit(50);
  };

  if (selectedTestId) {
    const test = tests?.find((t) => t.id === selectedTestId);
    if (test) {
      return (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setSelectedTestId(null)}>
            ← Voltar para lista
          </Button>
          <ABTestReport test={test} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" /> Testes A/B
          </h2>
          <p className="text-sm text-muted-foreground">Teste variações e veja qual converte mais</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Teste
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Criar novo teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do teste</Label>
                <Input placeholder="Ex: Título hero mais direto" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>O que testar</Label>
                <Select value={targetSection} onValueChange={setTargetSection}>
                  <SelectTrigger><SelectValue placeholder="Escolha a seção" /></SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Variante A (atual)</Label>
                <Input placeholder="Texto atual" value={variantA} onChange={(e) => setVariantA(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Variante B (nova)</Label>
                <Input placeholder="Texto novo a testar" value={variantB} onChange={(e) => setVariantB(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>Tráfego para variante B (%)</Label>
              <Input type="number" min={10} max={90} value={trafficSplit} onChange={(e) => setTrafficSplit(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createTest.mutate()} disabled={!name || !targetSection || !variantA || !variantB}>
                Criar teste
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests list */}
      {isLoading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : !tests?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum teste A/B ainda. Crie um para começar!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => {
            const statusInfo = STATUS_LABELS[test.status] || STATUS_LABELS.paused;
            const targetLabel = TARGET_OPTIONS.find((o) => o.value === test.target_section)?.label || test.target_section;

            return (
              <Card key={test.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{test.name}</h3>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        {test.winner && (
                          <Badge variant="default" className="bg-amber-500">
                            <Trophy className="h-3 w-3 mr-1" /> Variante {test.winner.toUpperCase()} venceu
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{targetLabel} • {test.traffic_split}% tráfego para B</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>A: "{test.variant_a_value.substring(0, 50)}{test.variant_a_value.length > 50 ? '...' : ''}"</span>
                        <span>B: "{test.variant_b_value.substring(0, 50)}{test.variant_b_value.length > 50 ? '...' : ''}"</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setSelectedTestId(test.id)}>
                        Ver relatório
                      </Button>
                      {test.status === "paused" && (
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: test.id, status: "active" })}>
                          <Play className="h-3 w-3 mr-1" /> Ativar
                        </Button>
                      )}
                      {test.status === "active" && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => updateStatus.mutate({ id: test.id, status: "paused" })}>
                            <Pause className="h-3 w-3 mr-1" /> Pausar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: test.id, status: "completed", winner: "a" })}>
                            A vence
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: test.id, status: "completed", winner: "b" })}>
                            B vence
                          </Button>
                        </>
                      )}
                      {test.status !== "active" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteTest.mutate(test.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
