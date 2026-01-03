import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  History,
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Package,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
} from "lucide-react";
import { useMarmitaFlavors, useKitSoups, useKitJuices } from "@/hooks/useMenuData";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface StockMovement {
  id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  movement_type: string;
  quantity_before: number | null;
  quantity_after: number | null;
  quantity_change: number;
  notes: string | null;
  created_at: string;
}

interface StockItem {
  id: string;
  name: string;
  type: 'marmita_flavor' | 'kit_soup' | 'kit_juice';
  stock_quantity: number | null;
}

const StockHistory = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [addQuantity, setAddQuantity] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const queryClient = useQueryClient();
  const { data: marmitaFlavors } = useMarmitaFlavors();
  const { data: kitSoups } = useKitSoups();
  const { data: kitJuices } = useKitJuices();

  // Combine all items for selection
  const allItems = useMemo<StockItem[]>(() => {
    const items: StockItem[] = [];

    marmitaFlavors?.forEach(f => {
      items.push({
        id: f.id,
        name: f.name,
        type: 'marmita_flavor',
        stock_quantity: f.stock_quantity,
      });
    });

    kitSoups?.forEach(s => {
      items.push({
        id: s.id,
        name: s.name,
        type: 'kit_soup',
        stock_quantity: s.stock_quantity,
      });
    });

    kitJuices?.forEach(j => {
      items.push({
        id: j.id,
        name: j.name,
        type: 'kit_juice',
        stock_quantity: j.stock_quantity,
      });
    });

    return items;
  }, [marmitaFlavors, kitSoups, kitJuices]);

  const fetchMovements = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching movements:', error);
    } else {
      setMovements(data as StockMovement[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('stock-movements-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_movements'
        },
        (payload) => {
          const newMovement = payload.new as StockMovement;
          setMovements(prev => [newMovement, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (search && !m.item_name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (typeFilter !== 'all' && m.movement_type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [movements, search, typeFilter]);

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'production':
        return (
          <Badge className="bg-green-500/10 text-green-600 gap-1">
            <ArrowUpCircle className="w-3 h-3" />
            Produção
          </Badge>
        );
      case 'sale':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 gap-1">
            <ArrowDownCircle className="w-3 h-3" />
            Venda
          </Badge>
        );
      case 'adjustment':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 gap-1">
            <Settings className="w-3 h-3" />
            Ajuste
          </Badge>
        );
      case 'initial':
        return (
          <Badge variant="secondary" className="gap-1">
            <Package className="w-3 h-3" />
            Inicial
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'marmita_flavor': return '🍱 Marmita';
      case 'kit_soup': return '🍲 Sopa';
      case 'kit_juice': return '🧃 Suco';
      default: return type;
    }
  };

  const handleAddProduction = async () => {
    if (!selectedItem || !addQuantity) return;

    const quantity = parseInt(addQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "Informe uma quantidade válida maior que zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Get current stock
      const tableName = selectedItem.type === 'marmita_flavor' ? 'marmita_flavors' :
                       selectedItem.type === 'kit_soup' ? 'kit_soups' : 'kit_juices';
      
      const { data: currentData, error: fetchError } = await supabase
        .from(tableName)
        .select('stock_quantity')
        .eq('id', selectedItem.id)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = currentData?.stock_quantity ?? 0;
      const newStock = currentStock + quantity;

      // Update stock
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ stock_quantity: newStock })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Log movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          item_type: selectedItem.type,
          item_id: selectedItem.id,
          item_name: selectedItem.name,
          movement_type: 'production',
          quantity_before: currentStock,
          quantity_after: newStock,
          quantity_change: quantity,
          notes: addNotes || null,
        });

      if (movementError) throw movementError;

      toast({
        title: "Produção registrada!",
        description: `+${quantity} unidades de ${selectedItem.name}`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['marmita-flavors'] });
      queryClient.invalidateQueries({ queryKey: ['kit-soups'] });
      queryClient.invalidateQueries({ queryKey: ['kit-juices'] });

      // Reset and close
      setIsAddModalOpen(false);
      setSelectedItem(null);
      setAddQuantity("");
      setAddNotes("");
      fetchMovements();

    } catch (error) {
      console.error('Error adding production:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a produção. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayMovements = movements.filter(m => new Date(m.created_at) >= today);
    const productionToday = todayMovements
      .filter(m => m.movement_type === 'production')
      .reduce((sum, m) => sum + m.quantity_change, 0);
    const salesToday = todayMovements
      .filter(m => m.movement_type === 'sale')
      .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);

    return { productionToday, salesToday };
  }, [movements]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{movements.length}</p>
                <p className="text-xs text-muted-foreground">Movimentações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">+{stats.productionToday}</p>
                <p className="text-xs text-muted-foreground">Produção hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">-{stats.salesToday}</p>
                <p className="text-xs text-muted-foreground">Vendas hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setIsAddModalOpen(true)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">Adicionar</p>
                <p className="text-xs text-muted-foreground">Registrar produção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Movimentações
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchMovements}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Produção
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
                <SelectItem value="sale">Vendas</SelectItem>
                <SelectItem value="adjustment">Ajustes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Data/Hora</th>
                    <th className="pb-3 font-medium text-muted-foreground">Item</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
                    <th className="pb-3 font-medium text-muted-foreground">Movimento</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Alteração</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center hidden sm:table-cell">Antes → Depois</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden lg:table-cell">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="text-xs">
                          {new Date(movement.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(movement.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="py-3">
                        <p className="font-medium">{movement.item_name}</p>
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {getItemTypeLabel(movement.item_type)}
                        </span>
                      </td>
                      <td className="py-3">
                        {getMovementBadge(movement.movement_type)}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-mono font-bold ${
                          movement.quantity_change > 0 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                        </span>
                      </td>
                      <td className="py-3 text-center hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {movement.quantity_before ?? '?'} → {movement.quantity_after ?? '?'}
                        </span>
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                          {movement.notes || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Production Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Registrar Produção
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item</label>
              <Select
                value={selectedItem?.id || ""}
                onValueChange={(id) => {
                  const item = allItems.find(i => i.id === id);
                  setSelectedItem(item || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o item..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" disabled>Selecione...</SelectItem>
                  {allItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {getItemTypeLabel(item.type)} - {item.name} 
                      {item.stock_quantity !== null && ` (${item.stock_quantity} em estoque)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Quantidade produzida</label>
              <Input
                type="number"
                placeholder="Ex: 10"
                value={addQuantity}
                onChange={(e) => setAddQuantity(e.target.value)}
                min={1}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Observação (opcional)</label>
              <Textarea
                placeholder="Ex: Produção da manhã, lote 42..."
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
                rows={2}
              />
            </div>

            {selectedItem && addQuantity && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-700 dark:text-green-400">
                  <strong>{selectedItem.name}</strong>: {selectedItem.stock_quantity ?? 0} → {(selectedItem.stock_quantity ?? 0) + parseInt(addQuantity || '0')} unidades
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddProduction}
              disabled={!selectedItem || !addQuantity || isSaving}
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Registrar Produção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockHistory;
