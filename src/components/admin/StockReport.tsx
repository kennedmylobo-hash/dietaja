import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  AlertTriangle,
  Search,
  Download,
  TrendingDown,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useMarmitaFlavors, useKitSoups, useKitJuices } from "@/hooks/useMenuData";

interface StockItem {
  id: string;
  name: string;
  category: string;
  type: 'marmita' | 'sopa' | 'suco';
  stock_quantity: number | null;
  low_stock_threshold: number | null;
  show_stock: boolean;
  status: 'ok' | 'low' | 'out' | 'unlimited';
}

const StockReport = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: marmitaFlavors } = useMarmitaFlavors();
  const { data: kitSoups } = useKitSoups();
  const { data: kitJuices } = useKitJuices();

  // Combine all stock items
  const allItems = useMemo<StockItem[]>(() => {
    const items: StockItem[] = [];

    // Marmita flavors
    marmitaFlavors?.forEach(f => {
      const threshold = f.low_stock_threshold ?? 5;
      let status: StockItem['status'] = 'unlimited';
      
      if (f.stock_quantity !== null) {
        if (f.stock_quantity === 0) status = 'out';
        else if (f.stock_quantity < threshold) status = 'low';
        else status = 'ok';
      }

      items.push({
        id: f.id,
        name: f.name,
        category: f.category,
        type: 'marmita',
        stock_quantity: f.stock_quantity,
        low_stock_threshold: f.low_stock_threshold,
        show_stock: f.show_stock,
        status,
      });
    });

    // Kit soups
    kitSoups?.forEach(s => {
      const threshold = s.low_stock_threshold ?? 5;
      let status: StockItem['status'] = 'unlimited';
      
      if (s.stock_quantity !== null) {
        if (s.stock_quantity === 0) status = 'out';
        else if (s.stock_quantity < threshold) status = 'low';
        else status = 'ok';
      }

      items.push({
        id: s.id,
        name: s.name,
        category: 'sopas',
        type: 'sopa',
        stock_quantity: s.stock_quantity,
        low_stock_threshold: s.low_stock_threshold,
        show_stock: s.show_stock,
        status,
      });
    });

    // Kit juices
    kitJuices?.forEach(j => {
      const threshold = j.low_stock_threshold ?? 5;
      let status: StockItem['status'] = 'unlimited';
      
      if (j.stock_quantity !== null) {
        if (j.stock_quantity === 0) status = 'out';
        else if (j.stock_quantity < threshold) status = 'low';
        else status = 'ok';
      }

      items.push({
        id: j.id,
        name: j.name,
        category: 'sucos',
        type: 'suco',
        stock_quantity: j.stock_quantity,
        low_stock_threshold: j.low_stock_threshold,
        show_stock: j.show_stock,
        status,
      });
    });

    // Sort by stock quantity (nulls at end, then ascending)
    return items.sort((a, b) => {
      if (a.stock_quantity === null && b.stock_quantity === null) return 0;
      if (a.stock_quantity === null) return 1;
      if (b.stock_quantity === null) return -1;
      return a.stock_quantity - b.stock_quantity;
    });
  }, [marmitaFlavors, kitSoups, kitJuices]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Search filter
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [allItems, search, typeFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const tracked = allItems.filter(i => i.stock_quantity !== null);
    return {
      total: allItems.length,
      tracked: tracked.length,
      out: allItems.filter(i => i.status === 'out').length,
      low: allItems.filter(i => i.status === 'low').length,
      ok: allItems.filter(i => i.status === 'ok').length,
    };
  }, [allItems]);

  const getStatusBadge = (item: StockItem) => {
    switch (item.status) {
      case 'out':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Esgotado
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 gap-1">
            <AlertTriangle className="w-3 h-3" />
            Baixo ({item.stock_quantity})
          </Badge>
        );
      case 'ok':
        return (
          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 gap-1">
            <CheckCircle className="w-3 h-3" />
            OK ({item.stock_quantity})
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            ∞ Ilimitado
          </Badge>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'marmita': return '🍱 Marmita';
      case 'sopa': return '🍲 Sopa';
      case 'suco': return '🧃 Suco';
      default: return type;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      carnes: '🥩 Carnes',
      frangos: '🍗 Frangos',
      massas: '🍝 Massas',
      especiais: '⭐ Especiais',
      sopas: '🍲 Sopas',
      sucos: '🧃 Sucos',
    };
    return labels[category] || category;
  };

  const exportCSV = () => {
    const headers = ['Nome', 'Tipo', 'Categoria', 'Estoque', 'Limite Baixo', 'Status', 'Exibir'];
    const rows = filteredItems.map(item => [
      item.name,
      item.type,
      item.category,
      item.stock_quantity ?? 'Ilimitado',
      item.low_stock_threshold ?? 5,
      item.status,
      item.show_stock ? 'Sim' : 'Não',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-estoque-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de itens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.out > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.out}</p>
                <p className="text-xs text-muted-foreground">Esgotados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.low > 0 ? "border-orange-500/50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.low}</p>
                <p className="text-xs text-muted-foreground">Estoque baixo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.ok}</p>
                <p className="text-xs text-muted-foreground">OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts for critical stock */}
      {(stats.out > 0 || stats.low > 0) && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  Atenção ao estoque!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.out > 0 && `${stats.out} item(s) esgotado(s). `}
                  {stats.low > 0 && `${stats.low} item(s) com estoque baixo.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Relatório de Estoque
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
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
                <SelectItem value="marmita">🍱 Marmitas</SelectItem>
                <SelectItem value="sopa">🍲 Sopas</SelectItem>
                <SelectItem value="suco">🧃 Sucos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="out">Esgotados</SelectItem>
                <SelectItem value="low">Estoque baixo</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="unlimited">Ilimitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stock table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Nome</th>
                  <th className="pb-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Estoque</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center hidden sm:table-cell">Limite</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum item encontrado
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr 
                      key={`${item.type}-${item.id}`} 
                      className={`border-b last:border-0 ${
                        item.status === 'out' ? 'bg-destructive/5' : 
                        item.status === 'low' ? 'bg-orange-500/5' : ''
                      }`}
                    >
                      <td className="py-3">
                        <p className="font-medium">{item.name}</p>
                      </td>
                      <td className="py-3">
                        <span className="text-xs">{getTypeLabel(item.type)}</span>
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {getCategoryLabel(item.category)}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-mono font-bold ${
                          item.status === 'out' ? 'text-destructive' :
                          item.status === 'low' ? 'text-orange-600' :
                          item.stock_quantity === null ? 'text-muted-foreground' : ''
                        }`}>
                          {item.stock_quantity ?? '∞'}
                        </span>
                      </td>
                      <td className="py-3 text-center hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {item.low_stock_threshold ?? 5}
                        </span>
                      </td>
                      <td className="py-3">
                        {getStatusBadge(item)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockReport;
