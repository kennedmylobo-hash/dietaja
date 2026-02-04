import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { 
  Save, 
  Loader2, 
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
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

interface MarmitaSide {
  id: string;
  name: string;
  weight_grams: number;
  category: string;
  active: boolean;
  sort_order: number;
}

const SidesManager = () => {
  const [sides, setSides] = useState<MarmitaSide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSideName, setNewSideName] = useState("");
  const [newSideWeight, setNewSideWeight] = useState(100);
  const [newSideCategory, setNewSideCategory] = useState("acompanhamento");

  const categories = [
    { value: 'carboidrato', label: '🍚 Carboidrato' },
    { value: 'leguminosa', label: '🫘 Leguminosa' },
    { value: 'vegetal', label: '🥬 Vegetal' },
    { value: 'acompanhamento', label: '🍽️ Acompanhamento' },
  ];

  useEffect(() => {
    fetchSides();
  }, []);

  const fetchSides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marmita_sides')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setSides(data || []);
    } catch (error) {
      console.error('Error fetching sides:', error);
      toast({
        title: "Erro ao carregar acompanhamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSide = (id: string, field: keyof MarmitaSide, value: any) => {
    setSides(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const addSide = async () => {
    if (!newSideName.trim()) {
      toast({ title: "Digite o nome do acompanhamento", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const maxOrder = Math.max(...sides.map(s => s.sort_order), 0);
      
      const { data, error } = await supabase
        .from('marmita_sides')
        .insert({
          name: newSideName.trim(),
          weight_grams: newSideWeight,
          category: newSideCategory,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSides(prev => [...prev, data]);
      setNewSideName("");
      setNewSideWeight(100);
      toast({ title: "Acompanhamento adicionado!" });
    } catch (error) {
      console.error('Error adding side:', error);
      toast({
        title: "Erro ao adicionar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveSides = async () => {
    setSaving(true);
    try {
      for (const side of sides) {
        const { error } = await supabase
          .from('marmita_sides')
          .update({
            name: side.name,
            weight_grams: side.weight_grams,
            category: side.category,
            active: side.active,
            sort_order: side.sort_order,
          })
          .eq('id', side.id);
        
        if (error) throw error;
      }
      toast({ title: "Acompanhamentos salvos com sucesso!" });
    } catch (error) {
      console.error('Error saving sides:', error);
      toast({
        title: "Erro ao salvar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteSide = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este acompanhamento?")) return;
    
    try {
      const { error } = await supabase
        .from('marmita_sides')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSides(prev => prev.filter(s => s.id !== id));
      toast({ title: "Acompanhamento excluído!" });
    } catch (error) {
      console.error('Error deleting side:', error);
      toast({
        title: "Erro ao excluir",
        variant: "destructive",
      });
    }
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">⚖️ Acompanhamentos e Pesos</CardTitle>
        <Button onClick={saveSides} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add new side */}
        <div className="flex flex-wrap gap-2 items-end p-4 bg-muted/50 rounded-lg">
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input
              value={newSideName}
              onChange={(e) => setNewSideName(e.target.value)}
              placeholder="Ex: Arroz integral"
              className="h-9"
            />
          </div>
          <div className="w-24">
            <label className="text-xs text-muted-foreground">Peso (g)</label>
            <Input
              type="number"
              value={newSideWeight}
              onChange={(e) => setNewSideWeight(parseInt(e.target.value) || 100)}
              className="h-9"
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Categoria</label>
            <Select value={newSideCategory} onValueChange={setNewSideCategory}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addSide} disabled={saving} size="sm" className="h-9">
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Sides table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-24">Peso (g)</TableHead>
              <TableHead className="w-40">Categoria</TableHead>
              <TableHead className="w-20">Ativo</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sides.map((side) => (
              <TableRow key={side.id} className={!side.active ? 'opacity-50' : ''}>
                <TableCell>
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                </TableCell>
                <TableCell>
                  <Input
                    value={side.name}
                    onChange={(e) => updateSide(side.id, 'name', e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={side.weight_grams}
                    onChange={(e) => updateSide(side.id, 'weight_grams', parseInt(e.target.value) || 100)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Select 
                    value={side.category} 
                    onValueChange={(v) => updateSide(side.id, 'category', v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={side.active}
                    onCheckedChange={(checked) => updateSide(side.id, 'active', checked)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteSide(side.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {sides.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum acompanhamento cadastrado</p>
            <p className="text-sm">Adicione acompanhamentos para configurar os pesos das marmitas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SidesManager;
