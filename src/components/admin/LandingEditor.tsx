import { useState, useEffect, useRef, useCallback } from "react";
import { useAllLandingContent, useUpsertLandingContent } from "@/hooks/useLandingContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionEditor } from "./SectionEditor";
import { toast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, LayoutDashboard, Monitor, PanelLeftClose, PanelLeft, RefreshCw } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";

const SECTION_LABELS: Record<string, string> = {
  hero: "🏠 Hero (Topo)",
  identification: "💬 Identificação",
  testimonials: "⭐ Depoimentos",
  solution: "💡 Solução",
  before_after: "🔄 Antes/Depois",
  product_gallery: "📸 Galeria de Produtos",
  banners: "📢 Banners Promo",
  guarantee: "🛡️ Garantias",
  faq: "❓ FAQ",
  custom_diet: "🥗 Dieta Personalizada",
};

export default function LandingEditor() {
  const { sections, isLoading } = useAllLandingContent();
  const upsertMutation = useUpsertLandingContent();
  const [editedContent, setEditedContent] = useState<Record<string, any>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [showPreview, setShowPreview] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { tenant } = useTenant();

  const publicUrl = tenant?.domain
    ? `https://${tenant.domain}`
    : `https://diet-on-demand.lovable.app?tenant=${tenant?.slug || 'dietaja'}`;

  useEffect(() => {
    if (sections.length > 0) {
      const contentMap: Record<string, any> = {};
      const visMap: Record<string, boolean> = {};
      sections.forEach((s) => {
        contentMap[s.section_key] = s.content;
        visMap[s.section_key] = s.is_visible;
      });
      setEditedContent(contentMap);
      setVisibility(visMap);
    }
  }, [sections]);

  const saveSection = async (sectionKey: string) => {
    try {
      await upsertMutation.mutateAsync({
        sectionKey,
        content: editedContent[sectionKey],
        isVisible: visibility[sectionKey],
      });
      toast({ title: "Seção salva!", description: `${SECTION_LABELS[sectionKey] || sectionKey} atualizada.` });
      // Refresh preview after save
      refreshPreview();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const updateField = (sectionKey: string, field: string, value: any) => {
    setEditedContent((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [field]: value },
    }));
  };

  const toggleVisibility = (sectionKey: string) => {
    setVisibility((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const refreshPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src += "";
    }
  }, []);

  if (isLoading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <LayoutDashboard className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum conteúdo configurado ainda.</p>
          <p className="text-sm">O conteúdo será criado automaticamente ao configurar o restaurante.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Editor da Landing Page</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="hidden lg:flex"
          >
            {showPreview ? <PanelLeftClose className="w-4 h-4 mr-1" /> : <PanelLeft className="w-4 h-4 mr-1" />}
            {showPreview ? "Ocultar Preview" : "Mostrar Preview"}
          </Button>
          <Button variant="outline" size="sm" onClick={refreshPreview}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className={`flex gap-6 ${showPreview ? 'flex-col lg:flex-row' : ''}`}>
        {/* Editor Column */}
        <div className={showPreview ? 'w-full lg:w-1/2' : 'w-full'}>
          <Tabs defaultValue={sections[0]?.section_key || "hero"}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {sections.map((s) => (
                <TabsTrigger key={s.section_key} value={s.section_key} className="text-xs">
                  {SECTION_LABELS[s.section_key] || s.section_key}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.section_key} value={section.section_key}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{SECTION_LABELS[section.section_key]}</CardTitle>
                      <div className="flex items-center gap-2">
                        {visibility[section.section_key] ? (
                          <Eye className="w-4 h-4 text-primary" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Switch
                          checked={visibility[section.section_key] ?? true}
                          onCheckedChange={() => toggleVisibility(section.section_key)}
                        />
                        <Label className="text-sm">{visibility[section.section_key] ? "Visível" : "Oculta"}</Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderSectionForm(section.section_key, editedContent[section.section_key] || {}, updateField)}
                    <Button onClick={() => saveSection(section.section_key)} disabled={upsertMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar {SECTION_LABELS[section.section_key]}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Preview Column */}
        {showPreview && (
          <div className="w-full lg:w-1/2 lg:sticky lg:top-4 lg:self-start">
            <Card className="overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Preview da Loja</span>
                  </div>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Abrir em nova aba ↗
                  </a>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
                  <iframe
                    ref={iframeRef}
                    src={publicUrl}
                    className="w-full h-full border-0"
                    title="Preview da loja"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Mobile preview toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Monitor className="w-4 h-4 mr-2" />
          {showPreview ? "Ocultar Preview" : "Ver Preview da Loja"}
        </Button>
      </div>
    </div>
  );
}

function renderSectionForm(
  sectionKey: string,
  content: Record<string, any>,
  updateField: (sectionKey: string, field: string, value: any) => void
) {
  switch (sectionKey) {
    case "hero":
      return (
        <div className="space-y-4">
          <div>
            <Label>Título Principal</Label>
            <Input value={content.title || ""} onChange={(e) => updateField(sectionKey, "title", e.target.value)} />
          </div>
          <div>
            <Label>Destaque (texto colorido)</Label>
            <Input value={content.title_highlight || ""} onChange={(e) => updateField(sectionKey, "title_highlight", e.target.value)} />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Textarea value={content.subtitle || ""} onChange={(e) => updateField(sectionKey, "subtitle", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Social Proof - Avaliações</Label>
            <Input value={content.social_proof_rating || ""} onChange={(e) => updateField(sectionKey, "social_proof_rating", e.target.value)} />
          </div>
          <div>
            <Label>Social Proof - Satisfação</Label>
            <Input value={content.social_proof_satisfaction || ""} onChange={(e) => updateField(sectionKey, "social_proof_satisfaction", e.target.value)} />
          </div>
          <div>
            <Label>Badges</Label>
            <SectionEditor
              items={content.badges || []}
              fields={[
                { key: "emoji", label: "Emoji", type: "text" },
                { key: "text", label: "Texto", type: "text" },
              ]}
              onUpdate={(items) => updateField(sectionKey, "badges", items)}
              addLabel="Adicionar Badge"
            />
          </div>
        </div>
      );

    case "identification":
      return (
        <div className="space-y-4">
          <div>
            <Label>Texto Principal</Label>
            <Textarea value={content.title || ""} onChange={(e) => updateField(sectionKey, "title", e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Itens de Identificação</Label>
            <SectionEditor
              items={(content.items || []).map((t: string) => ({ text: t }))}
              fields={[{ key: "text", label: "Texto", type: "text" }]}
              onUpdate={(items) => updateField(sectionKey, "items", items.map((i) => i.text))}
              addLabel="Adicionar Item"
            />
          </div>
        </div>
      );

    case "testimonials":
      return (
        <div>
          <Label>Depoimentos</Label>
          <SectionEditor
            items={content.items || []}
            fields={[
              { key: "name", label: "Nome", type: "text" },
              { key: "role", label: "Cargo/Descrição", type: "text" },
              { key: "quote", label: "Depoimento", type: "textarea" },
              { key: "initials", label: "Iniciais", type: "text" },
            ]}
            onUpdate={(items) => updateField(sectionKey, "items", items)}
            addLabel="Adicionar Depoimento"
          />
        </div>
      );

    case "solution":
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={content.title || ""} onChange={(e) => updateField(sectionKey, "title", e.target.value)} />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Textarea value={content.subtitle || ""} onChange={(e) => updateField(sectionKey, "subtitle", e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Features</Label>
            <SectionEditor
              items={content.features || []}
              fields={[
                { key: "icon", label: "Emoji/Ícone", type: "text" },
                { key: "title", label: "Título", type: "text" },
                { key: "description", label: "Descrição", type: "text" },
              ]}
              onUpdate={(items) => updateField(sectionKey, "features", items)}
              addLabel="Adicionar Feature"
            />
          </div>
        </div>
      );

    case "before_after":
      return (
        <div className="space-y-4">
          <div>
            <Label>Título "Antes"</Label>
            <Input value={content.before_title || ""} onChange={(e) => updateField(sectionKey, "before_title", e.target.value)} />
          </div>
          <div>
            <Label>Itens "Antes"</Label>
            <SectionEditor
              items={(content.before_items || []).map((t: string) => ({ text: t }))}
              fields={[{ key: "text", label: "Texto", type: "text" }]}
              onUpdate={(items) => updateField(sectionKey, "before_items", items.map((i) => i.text))}
              addLabel="Adicionar item Antes"
            />
          </div>
          <div>
            <Label>Título "Depois"</Label>
            <Input value={content.after_title || ""} onChange={(e) => updateField(sectionKey, "after_title", e.target.value)} />
          </div>
          <div>
            <Label>Itens "Depois"</Label>
            <SectionEditor
              items={(content.after_items || []).map((t: string) => ({ text: t }))}
              fields={[{ key: "text", label: "Texto", type: "text" }]}
              onUpdate={(items) => updateField(sectionKey, "after_items", items.map((i) => i.text))}
              addLabel="Adicionar item Depois"
            />
          </div>
        </div>
      );

    case "banners":
      return (
        <div>
          <Label>Banners Promocionais</Label>
          <SectionEditor
            items={content.items || []}
            fields={[
              { key: "title", label: "Título", type: "text" },
              { key: "subtitle", label: "Subtítulo", type: "text" },
              { key: "description", label: "Descrição", type: "text" },
            ]}
            onUpdate={(items) => updateField(sectionKey, "items", items)}
            addLabel="Adicionar Banner"
          />
        </div>
      );

    case "guarantee":
      return (
        <div>
          <Label>Garantias</Label>
          <SectionEditor
            items={content.items || []}
            fields={[
              { key: "icon", label: "Emoji/Ícone", type: "text" },
              { key: "title", label: "Título", type: "text" },
              { key: "description", label: "Descrição", type: "text" },
            ]}
            onUpdate={(items) => updateField(sectionKey, "items", items)}
            addLabel="Adicionar Garantia"
          />
        </div>
      );

    case "faq":
      return (
        <div>
          <Label>Perguntas e Respostas</Label>
          <SectionEditor
            items={content.items || []}
            fields={[
              { key: "question", label: "Pergunta", type: "text" },
              { key: "answer", label: "Resposta", type: "textarea" },
            ]}
            onUpdate={(items) => updateField(sectionKey, "items", items)}
            addLabel="Adicionar Pergunta"
          />
        </div>
      );

    case "product_gallery":
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={content.title || ""} onChange={(e) => updateField(sectionKey, "title", e.target.value)} />
          </div>
          <div>
            <Label>Badges</Label>
            <SectionEditor
              items={(content.badges || []).map((t: string) => ({ text: t }))}
              fields={[{ key: "text", label: "Badge", type: "text" }]}
              onUpdate={(items) => updateField(sectionKey, "badges", items.map((i) => i.text))}
              addLabel="Adicionar Badge"
            />
          </div>
        </div>
      );

    case "custom_diet":
      return (
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={content.title || ""} onChange={(e) => updateField(sectionKey, "title", e.target.value)} />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Input value={content.subtitle || ""} onChange={(e) => updateField(sectionKey, "subtitle", e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={content.description || ""} onChange={(e) => updateField(sectionKey, "description", e.target.value)} rows={3} />
          </div>
        </div>
      );

    default:
      return <p className="text-muted-foreground">Editor não disponível para esta seção.</p>;
  }
}
