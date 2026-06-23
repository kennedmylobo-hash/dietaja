import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  Save, 
  Loader2, 
  UtensilsCrossed, 
  Salad, 
  Plus,
  Trash2,
  GripVertical,
  Star,
  LayoutGrid,
  ListChecks
} from "lucide-react";
import CategoryManager from "./CategoryManager";
import FlavorCompositionModal from "./FlavorCompositionModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MarmitaPackage {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  image_url: string | null;
  active: boolean;
  popular: boolean;
  sort_order: number;
  line_type: string;
  weight: number;
  description: string | null;
}

interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
  active: boolean;
  sort_order: number;
  stock_quantity: number | null;
  show_stock: boolean;
  low_stock_threshold: number | null;
  sides: any;
  price_override_fit: number | null;
  price_override_fitness: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  fiber_g: number | null;
  allergens: string[];
  restrictions: string[];
}

interface CompositionModalState {
  isOpen: boolean;
  flavorId: string;
  flavorName: string;
  sides: any;
}

interface KitPackage {
  id: string;
  name: string;
  days: number;
  price: number;
  description: string | null;
  features: string[];
  active: boolean;
  popular: boolean;
  sort_order: number;
}

interface KitSoup {
  id: string;
  emoji: string;
  name: string;
  ingredients: string | null;
  benefit: string | null;
  active: boolean;
  sort_order: number;
  stock_quantity: number | null;
  show_stock: boolean;
  low_stock_threshold: number | null;
}

interface KitJuice {
  id: string;
  emoji: string;
  name: string;
  ingredients: string | null;
  benefit: string | null;
  active: boolean;
  sort_order: number;
  stock_quantity: number | null;
  show_stock: boolean;
  low_stock_threshold: number | null;
}

const MenuManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Marmitas state
  const [marmitaPackages, setMarmitaPackages] = useState<MarmitaPackage[]>([]);
  const [marmitaFlavors, setMarmitaFlavors] = useState<MarmitaFlavor[]>([]);
  const [newFlavorName, setNewFlavorName] = useState("");
  const [newFlavorCategory, setNewFlavorCategory] = useState("carnes");
  const [compositionModal, setCompositionModal] = useState<CompositionModalState>({
    isOpen: false, flavorId: '', flavorName: '', sides: null,
  });
  const [macrosOpen, setMacrosOpen] = useState<string | null>(null);
  const allergenOptions = ["glúten", "lactose", "ovos", "amendoim", "castanhas", "soja", "gergelim", "crustáceos"];
  const restrictionOptions = ["vegano", "vegetariano", "sem lactose", "sem glúten", "low carb", "alta proteína"];
  // Kits state
  const [kitPackages, setKitPackages] = useState<KitPackage[]>([]);
  const [kitSoups, setKitSoups] = useState<KitSoup[]>([]);
  const [kitJuices, setKitJuices] = useState<KitJuice[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [packagesRes, flavorsRes, kitsRes, soupsRes, juicesRes] = await Promise.all([
        supabase.from('marmita_packages').select('*').order('sort_order'),
        supabase.from('marmita_flavors').select('*').order('category').order('sort_order'),
        supabase.from('kit_packages').select('*').order('sort_order'),
        supabase.from('kit_soups').select('*').order('sort_order'),
        supabase.from('kit_juices').select('*').order('sort_order'),
      ]);

      if (packagesRes.data) setMarmitaPackages(packagesRes.data.map(p => ({
        ...p,
        line_type: p.line_type || 'emagrecimento',
        weight: p.weight || 300,
        description: p.description || null,
      })));
      if (flavorsRes.data) setMarmitaFlavors(flavorsRes.data);
      if (kitsRes.data) setKitPackages(kitsRes.data.map(k => ({
        ...k,
        description: k.description || null,
        features: Array.isArray(k.features) ? (k.features as unknown as string[]) : []
      })));
      if (soupsRes.data) setKitSoups(soupsRes.data);
      if (juicesRes.data) setKitJuices(juicesRes.data);
    } catch (error) {
      console.error('Error fetching menu data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Tente recarregar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Marmita Package handlers
  const updateMarmitaPackage = (id: string, field: keyof MarmitaPackage, value: any) => {
    setMarmitaPackages(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const saveMarmitaPackages = async () => {
    setSaving(true);
    try {
      for (const pkg of marmitaPackages) {
        const { error } = await supabase
          .from('marmita_packages')
          .update({
            name: pkg.name,
            quantity: pkg.quantity,
            unit_price: pkg.unit_price,
            active: pkg.active,
            popular: pkg.popular,
            line_type: pkg.line_type,
            weight: pkg.weight,
            description: pkg.description,
          })
          .eq('id', pkg.id);
        
        if (error) throw error;
      }
      toast({ title: "Pacotes salvos com sucesso!" });
    } catch (error) {
      console.error('Error saving packages:', error);
      toast({
        title: "Erro ao salvar",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Marmita Flavor handlers
  const updateMarmitaFlavor = (id: string, field: keyof MarmitaFlavor, value: any) => {
    setMarmitaFlavors(prev => prev.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const addMarmitaFlavor = async () => {
    if (!newFlavorName.trim()) return;
    
    setSaving(true);
    try {
      const maxOrder = Math.max(...marmitaFlavors.filter(f => f.category === newFlavorCategory).map(f => f.sort_order), 0);
      
      const { data, error } = await supabase
        .from('marmita_flavors')
        .insert({
          name: newFlavorName.trim(),
          category: newFlavorCategory,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setMarmitaFlavors(prev => [...prev, data]);
      setNewFlavorName("");
      toast({ title: "Sabor adicionado!" });
    } catch (error) {
      console.error('Error adding flavor:', error);
      toast({
        title: "Erro ao adicionar sabor",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveMarmitaFlavors = async () => {
    setSaving(true);
    try {
      for (const flavor of marmitaFlavors) {
        const { error } = await supabase
          .from('marmita_flavors')
          .update({
            name: flavor.name,
            category: flavor.category,
            active: flavor.active,
            stock_quantity: flavor.stock_quantity,
            show_stock: flavor.show_stock,
            sides: flavor.sides,
            price_override_fit: flavor.price_override_fit,
            price_override_fitness: flavor.price_override_fitness,
            calories: flavor.calories || null,
            protein_g: flavor.protein_g || null,
            carbs_g: flavor.carbs_g || null,
            fats_g: flavor.fats_g || null,
            fiber_g: flavor.fiber_g || null,
            allergens: flavor.allergens || [],
            restrictions: flavor.restrictions || [],
          })
          .eq('id', flavor.id);
        
        if (error) throw error;
      }
      toast({ title: "Sabores salvos com sucesso!" });
    } catch (error) {
      console.error('Error saving flavors:', error);
      toast({
        title: "Erro ao salvar sabores",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteMarmitaFlavor = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este sabor?")) return;
    
    try {
      const { error } = await supabase
        .from('marmita_flavors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setMarmitaFlavors(prev => prev.filter(f => f.id !== id));
      toast({ title: "Sabor excluído!" });
    } catch (error) {
      console.error('Error deleting flavor:', error);
      toast({
        title: "Erro ao excluir sabor",
        variant: "destructive",
      });
    }
  };

  // Kit Package handlers
  const updateKitPackage = (id: string, field: keyof KitPackage, value: any) => {
    setKitPackages(prev => prev.map(k => 
      k.id === id ? { ...k, [field]: value } : k
    ));
  };

  const saveKitPackages = async () => {
    setSaving(true);
    try {
      for (const kit of kitPackages) {
        const { error } = await supabase
          .from('kit_packages')
          .update({
            name: kit.name,
            days: kit.days,
            price: kit.price,
            description: kit.description,
            features: kit.features,
            active: kit.active,
            popular: kit.popular,
          })
          .eq('id', kit.id);
        
        if (error) throw error;
      }
      toast({ title: "Kits salvos com sucesso!" });
    } catch (error) {
      console.error('Error saving kits:', error);
      toast({
        title: "Erro ao salvar kits",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Kit Soup handlers
  const updateKitSoup = (id: string, field: keyof KitSoup, value: any) => {
    setKitSoups(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const saveKitSoups = async () => {
    setSaving(true);
    try {
      for (const soup of kitSoups) {
        const { error } = await supabase
          .from('kit_soups')
          .update({
            emoji: soup.emoji,
            name: soup.name,
            ingredients: soup.ingredients,
            benefit: soup.benefit,
            active: soup.active,
            stock_quantity: soup.stock_quantity,
            show_stock: soup.show_stock,
          })
          .eq('id', soup.id);
        
        if (error) throw error;
      }
      toast({ title: "Sopas salvas com sucesso!" });
    } catch (error) {
      console.error('Error saving soups:', error);
      toast({
        title: "Erro ao salvar sopas",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Kit Juice handlers
  const updateKitJuice = (id: string, field: keyof KitJuice, value: any) => {
    setKitJuices(prev => prev.map(j => 
      j.id === id ? { ...j, [field]: value } : j
    ));
  };

  const saveKitJuices = async () => {
    setSaving(true);
    try {
      for (const juice of kitJuices) {
        const { error } = await supabase
          .from('kit_juices')
          .update({
            emoji: juice.emoji,
            name: juice.name,
            ingredients: juice.ingredients,
            benefit: juice.benefit,
            active: juice.active,
            stock_quantity: juice.stock_quantity,
            show_stock: juice.show_stock,
          })
          .eq('id', juice.id);
        
        if (error) throw error;
      }
      toast({ title: "Sucos salvos com sucesso!" });
    } catch (error) {
      console.error('Error saving juices:', error);
      toast({
        title: "Erro ao salvar sucos",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    carnes: "🥩 Carnes",
    frangos: "🍗 Frangos",
    massas: "🍝 Massas",
    especiais: "✨ Especiais",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="marmitas" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="marmitas" className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            Marmitas
          </TabsTrigger>
          <TabsTrigger value="kits" className="flex items-center gap-2">
            <Salad className="w-4 h-4" />
            Kits Detox
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Categorias
          </TabsTrigger>
        </TabsList>

        {/* MARMITAS TAB */}
        <TabsContent value="marmitas" className="space-y-6">
          {/* Pacotes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Pacotes de Marmitas</CardTitle>
              <Button onClick={saveMarmitaPackages} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </CardHeader>
            <CardContent>
              {/* Emagrecimento Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-sage mb-3 flex items-center gap-2">
                  🥗 Emagrecimento/Definição (300g)
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-20">Qtd</TableHead>
                      <TableHead className="w-24">Peso</TableHead>
                      <TableHead className="w-28">Preço/un</TableHead>
                      <TableHead className="w-20">Popular</TableHead>
                      <TableHead className="w-20">Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marmitaPackages.filter(p => p.line_type === 'emagrecimento').map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <Input
                            value={pkg.name}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'name', e.target.value)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={pkg.quantity}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={pkg.weight}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'weight', parseInt(e.target.value) || 300)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={pkg.unit_price}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={pkg.popular}
                              onCheckedChange={(checked) => updateMarmitaPackage(pkg.id, 'popular', checked)}
                            />
                            {pkg.popular && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={pkg.active}
                            onCheckedChange={(checked) => updateMarmitaPackage(pkg.id, 'active', checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Hipertrofia Section */}
              <div>
                <h3 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                  💪 FITNESS - Hipertrofia (450g)
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="w-20">Qtd</TableHead>
                      <TableHead className="w-24">Peso</TableHead>
                      <TableHead className="w-28">Preço/un</TableHead>
                      <TableHead className="w-20">Popular</TableHead>
                      <TableHead className="w-20">Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marmitaPackages.filter(p => p.line_type === 'hipertrofia').map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <Input
                            value={pkg.name}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'name', e.target.value)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={pkg.quantity}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={pkg.weight}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'weight', parseInt(e.target.value) || 450)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={pkg.unit_price}
                            onChange={(e) => updateMarmitaPackage(pkg.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={pkg.popular}
                              onCheckedChange={(checked) => updateMarmitaPackage(pkg.id, 'popular', checked)}
                            />
                            {pkg.popular && <Star className="w-4 h-4 text-blue-500 fill-blue-500" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={pkg.active}
                            onCheckedChange={(checked) => updateMarmitaPackage(pkg.id, 'active', checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sabores */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sabores ({marmitaFlavors.length})</CardTitle>
              <Button onClick={saveMarmitaFlavors} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new flavor */}
              <div className="flex gap-2 p-3 bg-muted rounded-lg">
                <Input
                  placeholder="Nome do novo sabor..."
                  value={newFlavorName}
                  onChange={(e) => setNewFlavorName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newFlavorCategory} onValueChange={setNewFlavorCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carnes">🥩 Carnes</SelectItem>
                    <SelectItem value="frangos">🍗 Frangos</SelectItem>
                    <SelectItem value="massas">🍝 Massas</SelectItem>
                    <SelectItem value="especiais">✨ Especiais</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addMarmitaFlavor} disabled={saving || !newFlavorName.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {/* Flavors by category */}
      {(['carnes', 'frangos', 'massas', 'especiais'] as const).map((category) => {
        const categoryFlavors = marmitaFlavors.filter(f => f.category === category);
        if (categoryFlavors.length === 0) return null;
        
        return (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">
              {categoryLabels[category]} ({categoryFlavors.length})
            </h4>
            <div className="grid gap-2">
              {categoryFlavors.map((flavor) => (
                <div key={flavor.id}>
                <div 
                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                    flavor.active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                  <Input
                    value={flavor.name}
                    onChange={(e) => updateMarmitaFlavor(flavor.id, 'name', e.target.value)}
                    className="flex-1 h-8"
                  />
                  <div className="flex items-center gap-1">
                    {/* Estoque com indicador visual */}
                    <div className="flex items-center">
                      <button
                        onClick={() => updateMarmitaFlavor(flavor.id, 'stock_quantity', Math.max(0, (flavor.stock_quantity ?? 0) - 1))}
                        className="h-8 w-7 flex items-center justify-center rounded-l-md border border-r-0 border-muted-foreground/30 hover:bg-muted transition-colors text-muted-foreground"
                      >−</button>
                      <Input
                        type="number"
                        placeholder="∞"
                        value={flavor.stock_quantity ?? ''}
                        onChange={(e) => updateMarmitaFlavor(flavor.id, 'stock_quantity', e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-14 h-8 text-center rounded-none border-x-0 text-xs"
                        min={0}
                        title="Quantidade em estoque"
                      />
                      <button
                        onClick={() => updateMarmitaFlavor(flavor.id, 'stock_quantity', (flavor.stock_quantity ?? 0) + 1)}
                        className="h-8 w-7 flex items-center justify-center rounded-r-md border border-l-0 border-muted-foreground/30 hover:bg-muted transition-colors text-muted-foreground"
                      >+</button>
                    </div>
                    {/* Status badge */}
                    {flavor.stock_quantity !== null ? (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                        flavor.stock_quantity === 0 ? 'bg-red-100 text-red-700' :
                        flavor.stock_quantity <= (flavor.low_stock_threshold ?? 5) ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {flavor.stock_quantity === 0 ? 'Esgotado' :
                         flavor.stock_quantity <= (flavor.low_stock_threshold ?? 5) ? 'Baixo' : 'OK'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground px-1">—</span>
                    )}
                    {/* Limite + Mostrar */}
                    <Input
                      type="number"
                      placeholder="lim"
                      value={flavor.low_stock_threshold ?? ''}
                      onChange={(e) => updateMarmitaFlavor(flavor.id, 'low_stock_threshold', e.target.value === '' ? null : parseInt(e.target.value))}
                      className="w-10 h-7 text-center text-[10px]"
                      min={0}
                      title="Limite para estoque baixo"
                    />
                    <Switch
                      checked={flavor.show_stock}
                      onCheckedChange={(checked) => updateMarmitaFlavor(flavor.id, 'show_stock', checked)}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col gap-0.5">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Fit R$"
                        value={flavor.price_override_fit ?? ''}
                        onChange={(e) => updateMarmitaFlavor(flavor.id, 'price_override_fit' as any, e.target.value === '' ? null : parseFloat(e.target.value))}
                        className="w-20 h-7 text-xs text-center"
                        title="Preço unitário Fit (vazio = usa preço do pacote)"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Fitness R$"
                        value={flavor.price_override_fitness ?? ''}
                        onChange={(e) => updateMarmitaFlavor(flavor.id, 'price_override_fitness' as any, e.target.value === '' ? null : parseFloat(e.target.value))}
                        className="w-20 h-7 text-xs text-center"
                        title="Preço unitário Fitness (vazio = usa preço do pacote)"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">R$/un</span>
                  </div>
                  <Button
                    className="h-8 text-xs gap-1 shrink-0"
                    onClick={() => setCompositionModal({
                      isOpen: true,
                      flavorId: flavor.id,
                      flavorName: flavor.name,
                      sides: flavor.sides,
                    })}
                    title="Editar composição Fit/Fitness"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    {flavor.sides && typeof flavor.sides === 'object' && !Array.isArray(flavor.sides) && (Object.keys(flavor.sides).length > 0) ? (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">✓</Badge>
                    ) : null}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-xs gap-1 shrink-0"
                    onClick={() => setMacrosOpen(macrosOpen === flavor.id ? null : flavor.id)}
                    title="Nutrição e restrições"
                  >
                    <Salad className="w-3.5 h-3.5" />
                  </Button>
                  <Switch
                    checked={flavor.active}
                    onCheckedChange={(checked) => updateMarmitaFlavor(flavor.id, 'active', checked)}
                  />
                  <Button 
                    variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMarmitaFlavor(flavor.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      {macrosOpen === flavor.id && (
                        <div className="p-3 mt-2 rounded-lg bg-muted/30 border border-border space-y-3">
                          <div className="grid grid-cols-5 gap-2">
                            <div>
                              <span className="text-xs text-muted-foreground block">Calorias</span>
                              <Input type="number" value={flavor.calories ?? ''} onChange={(e) => updateMarmitaFlavor(flavor.id, 'calories' as any, e.target.value === '' ? null : parseInt(e.target.value))} className="h-7 text-xs text-center" />
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Proteína (g)</span>
                              <Input type="number" step="0.1" value={flavor.protein_g ?? ''} onChange={(e) => updateMarmitaFlavor(flavor.id, 'protein_g' as any, e.target.value === '' ? null : parseFloat(e.target.value))} className="h-7 text-xs text-center" />
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Carboidratos (g)</span>
                              <Input type="number" step="0.1" value={flavor.carbs_g ?? ''} onChange={(e) => updateMarmitaFlavor(flavor.id, 'carbs_g' as any, e.target.value === '' ? null : parseFloat(e.target.value))} className="h-7 text-xs text-center" />
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Gorduras (g)</span>
                              <Input type="number" step="0.1" value={flavor.fats_g ?? ''} onChange={(e) => updateMarmitaFlavor(flavor.id, 'fats_g' as any, e.target.value === '' ? null : parseFloat(e.target.value))} className="h-7 text-xs text-center" />
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground block">Fibras (g)</span>
                              <Input type="number" step="0.1" value={flavor.fiber_g ?? ''} onChange={(e) => updateMarmitaFlavor(flavor.id, 'fiber_g' as any, e.target.value === '' ? null : parseFloat(e.target.value))} className="h-7 text-xs text-center" />
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs gap-1"
                            onClick={async () => {
                              const { supabase } = await import("@/integrations/supabase/client");
                              toast({ title: "Estimando macros com IA..." });
                              const { data, error } = await supabase.functions.invoke("estimate-macros", {
                                body: { name: flavor.name, category: flavor.category },
                              });
                              if (error || !data?.success) {
                                toast({ title: "Erro ao estimar macros", variant: "destructive" });
                                return;
                              }
                              if (data.calories) updateMarmitaFlavor(flavor.id, 'calories' as any, data.calories);
                              toast({ title: `Calorias estimadas: ${data.calories} kcal` });
                            }}
                          >
                            <Sparkles className="w-3 h-3" /> Estimar kcal
                          </Button>
                          <div>
                            <span className="text-xs text-muted-foreground block">Alérgenos</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {allergenOptions.map((a) => (
                                <button key={a} type="button" onClick={() => {
                                  const current = flavor.allergens || [];
                                  const updated = current.includes(a) ? current.filter((x) => x !== a) : [...current, a];
                                  updateMarmitaFlavor(flavor.id, 'allergens' as any, updated);
                                }} className={`px-2 py-0.5 rounded text-xs border transition-colors ${(flavor.allergens || []).includes(a) ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border hover:border-destructive/30'}`}>{a}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block">Restrições / Categorias</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {restrictionOptions.map((r) => (
                                <button key={r} type="button" onClick={() => {
                                  const current = flavor.restrictions || [];
                                  const updated = current.includes(r) ? current.filter((x) => x !== r) : [...current, r];
                                  updateMarmitaFlavor(flavor.id, 'restrictions' as any, updated);
                                }} className={`px-2 py-0.5 rounded text-xs border transition-colors ${(flavor.restrictions || []).includes(r) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}>{r}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TabsContent>

        {/* KITS TAB */}
        <TabsContent value="kits" className="space-y-6">
          {/* Kit Packages */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Kits Detox</CardTitle>
              <Button onClick={saveKitPackages} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {kitPackages.map((kit) => (
                <div key={kit.id} className={`p-4 rounded-lg border ${kit.active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        value={kit.name}
                        onChange={(e) => updateKitPackage(kit.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dias</label>
                        <Input
                          type="number"
                          value={kit.days}
                          onChange={(e) => updateKitPackage(kit.id, 'days', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Preço (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={kit.price}
                          onChange={(e) => updateKitPackage(kit.id, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="text-sm font-medium">Descrição</label>
                    <Textarea
                      value={kit.description || ''}
                      onChange={(e) => updateKitPackage(kit.id, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={kit.popular}
                        onCheckedChange={(checked) => updateKitPackage(kit.id, 'popular', checked)}
                      />
                      <span>Popular</span>
                      {kit.popular && <Badge variant="secondary">🔥 Mais Vendido</Badge>}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={kit.active}
                        onCheckedChange={(checked) => updateKitPackage(kit.id, 'active', checked)}
                      />
                      <span>Ativo</span>
                    </label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sopas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">🍲 Sopas Funcionais</CardTitle>
              <Button onClick={saveKitSoups} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {kitSoups.map((soup) => (
                <div key={soup.id} className={`p-3 rounded-lg border ${soup.active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                  <div className="grid gap-3 sm:grid-cols-[60px_1fr_1fr_80px_auto_60px]">
                    <Input
                      value={soup.emoji}
                      onChange={(e) => updateKitSoup(soup.id, 'emoji', e.target.value)}
                      className="text-center"
                      placeholder="🍲"
                    />
                    <Input
                      value={soup.name}
                      onChange={(e) => updateKitSoup(soup.id, 'name', e.target.value)}
                      placeholder="Nome"
                    />
                    <Input
                      value={soup.ingredients || ''}
                      onChange={(e) => updateKitSoup(soup.id, 'ingredients', e.target.value)}
                      placeholder="Ingredientes"
                    />
                    <Input
                      value={soup.benefit || ''}
                      onChange={(e) => updateKitSoup(soup.id, 'benefit', e.target.value)}
                      placeholder="Benefício"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="∞"
                        value={soup.stock_quantity ?? ''}
                        onChange={(e) => updateKitSoup(soup.id, 'stock_quantity', e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-14 text-center"
                        min={0}
                        title="Estoque"
                      />
                      <Input
                        type="number"
                        placeholder="5"
                        value={soup.low_stock_threshold ?? ''}
                        onChange={(e) => updateKitSoup(soup.id, 'low_stock_threshold', e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-12 text-center text-xs"
                        min={0}
                        title="Limite baixo"
                      />
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={soup.show_stock}
                          onCheckedChange={(checked) => updateKitSoup(soup.id, 'show_stock', checked)}
                        />
                        <span className="text-xs text-muted-foreground">Exibir</span>
                      </div>
                      {soup.show_stock && soup.stock_quantity !== null && soup.stock_quantity < (soup.low_stock_threshold ?? 5) && (
                        <Badge variant="destructive" className="text-[10px]">
                          {soup.stock_quantity === 0 ? 'Esgotado' : soup.stock_quantity}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={soup.active}
                        onCheckedChange={(checked) => updateKitSoup(soup.id, 'active', checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sucos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">🧃 Sucos Detox</CardTitle>
              <Button onClick={saveKitJuices} disabled={saving} size="sm">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {kitJuices.map((juice) => (
                <div key={juice.id} className={`p-3 rounded-lg border ${juice.active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                  <div className="grid gap-3 sm:grid-cols-[60px_1fr_1fr_80px_auto_60px]">
                    <Input
                      value={juice.emoji}
                      onChange={(e) => updateKitJuice(juice.id, 'emoji', e.target.value)}
                      className="text-center"
                      placeholder="🧃"
                    />
                    <Input
                      value={juice.name}
                      onChange={(e) => updateKitJuice(juice.id, 'name', e.target.value)}
                      placeholder="Nome"
                    />
                    <Input
                      value={juice.ingredients || ''}
                      onChange={(e) => updateKitJuice(juice.id, 'ingredients', e.target.value)}
                      placeholder="Ingredientes"
                    />
                    <Input
                      value={juice.benefit || ''}
                      onChange={(e) => updateKitJuice(juice.id, 'benefit', e.target.value)}
                      placeholder="Benefício"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="∞"
                        value={juice.stock_quantity ?? ''}
                        onChange={(e) => updateKitJuice(juice.id, 'stock_quantity', e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-14 text-center"
                        min={0}
                        title="Estoque"
                      />
                      <Input
                        type="number"
                        placeholder="5"
                        value={juice.low_stock_threshold ?? ''}
                        onChange={(e) => updateKitJuice(juice.id, 'low_stock_threshold', e.target.value === '' ? null : parseInt(e.target.value))}
                        className="w-12 text-center text-xs"
                        min={0}
                        title="Limite baixo"
                      />
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={juice.show_stock}
                          onCheckedChange={(checked) => updateKitJuice(juice.id, 'show_stock', checked)}
                        />
                        <span className="text-xs text-muted-foreground">Exibir</span>
                      </div>
                      {juice.show_stock && juice.stock_quantity !== null && juice.stock_quantity < (juice.low_stock_threshold ?? 5) && (
                        <Badge variant="destructive" className="text-[10px]">
                          {juice.stock_quantity === 0 ? 'Esgotado' : juice.stock_quantity}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-center">
                      <Switch
                        checked={juice.active}
                        onCheckedChange={(checked) => updateKitJuice(juice.id, 'active', checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIAS TAB */}
        <TabsContent value="categorias" className="space-y-6">
          <CategoryManager />
        </TabsContent>
      </Tabs>

      <FlavorCompositionModal
        isOpen={compositionModal.isOpen}
        onClose={() => setCompositionModal(prev => ({ ...prev, isOpen: false }))}
        flavorId={compositionModal.flavorId}
        flavorName={compositionModal.flavorName}
        sides={compositionModal.sides}
        onSaved={(flavorId, newSides) => {
          setMarmitaFlavors(prev => prev.map(f =>
            f.id === flavorId ? { ...f, sides: newSides } : f
          ));
        }}
      />
    </div>
  );
};

export default MenuManager;
