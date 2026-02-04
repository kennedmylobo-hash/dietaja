import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Printer, Share2, RefreshCw, ChefHat, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  printProductionPanel, 
  generateWhatsAppProductionText, 
  shareViaWhatsApp,
  formatDateShort 
} from "@/lib/print-utils";

interface FlavorItem {
  name: string;
  quantity: number;
  category?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  totalPrice: number;
  type: string;
  flavors?: FlavorItem[];
}

interface Order {
  id: string;
  order_number: string | null;
  status: string;
  items: OrderItem[];
  customer_name: string;
  created_at: string;
}

interface MarmitaSide {
  id: string;
  name: string;
  weight_grams: number;
  category: string;
}

interface MarmitaFlavor {
  id: string;
  name: string;
  category: string;
  sides: { name: string; weight: number }[] | null;
}

interface KitJuice {
  id: string;
  emoji: string;
  name: string;
}

interface KitSoup {
  id: string;
  emoji: string;
  name: string;
}

interface ProductionItem {
  flavorName: string;
  category: string;
  totalQuantity: number;
  proteinWeight: number;
  sides: { name: string; weightPerUnit: number; totalWeight: number }[];
  customers: { name: string; quantity: number }[];
}

interface ProductionPanelProps {
  dateFilter: 'today' | 'week' | 'month';
}

const ProductionPanel = ({ dateFilter }: ProductionPanelProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [marmitaSides, setMarmitaSides] = useState<MarmitaSide[]>([]);
  const [marmitaFlavors, setMarmitaFlavors] = useState<MarmitaFlavor[]>([]);
  const [kitJuices, setKitJuices] = useState<KitJuice[]>([]);
  const [kitSoups, setKitSoups] = useState<KitSoup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('production');

  const PROTEIN_WEIGHT = 150; // Default protein weight in grams

  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    
    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setDate(now.getDate() - 30);
        break;
    }
    
    return start.toISOString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    const startDate = getDateRange();

    try {
      const [ordersRes, sidesRes, flavorsRes, juicesRes, soupsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, status, items, customer_name, created_at')
          .gte('created_at', startDate)
          .in('status', ['approved', 'preparing', 'ready', 'whatsapp_pending'])
          .order('created_at', { ascending: false }),
        supabase.from('marmita_sides').select('*').eq('active', true).order('sort_order'),
        supabase.from('marmita_flavors').select('id, name, category, sides').eq('active', true),
        supabase.from('kit_juices').select('id, emoji, name').eq('active', true).order('sort_order'),
        supabase.from('kit_soups').select('id, emoji, name').eq('active', true).order('sort_order'),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data as unknown as Order[]);
      if (sidesRes.data) setMarmitaSides(sidesRes.data);
      if (flavorsRes.data) setMarmitaFlavors(flavorsRes.data as unknown as MarmitaFlavor[]);
      if (juicesRes.data) setKitJuices(juicesRes.data);
      if (soupsRes.data) setKitSoups(soupsRes.data);
    } catch (error) {
      console.error('Error fetching production data:', error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  // Filter orders by status
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'production') {
      return orders.filter(o => ['approved', 'preparing'].includes(o.status));
    }
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Aggregate production data
  const productionData = useMemo(() => {
    const marmitaMap = new Map<string, ProductionItem>();
    const juiceMap = new Map<string, { emoji: string; name: string; quantity: number }>();
    const soupMap = new Map<string, { emoji: string; name: string; quantity: number }>();

    // Helper to get sides config for a flavor
    const getFlavorSides = (flavorName: string) => {
      const flavor = marmitaFlavors.find(f => 
        f.name.toLowerCase() === flavorName.toLowerCase()
      );
      if (flavor?.sides && Array.isArray(flavor.sides) && flavor.sides.length > 0) {
        return flavor.sides;
      }
      // Default sides if not configured
      return [
        { name: 'Arroz', weight: 200 },
        { name: 'Feijão', weight: 100 },
      ];
    };

    for (const order of filteredOrders) {
      if (!order.items || !Array.isArray(order.items)) continue;

      for (const item of order.items) {
        // Check if it's a marmita with flavors
        if (item.flavors && Array.isArray(item.flavors)) {
          for (const flavor of item.flavors) {
            const key = flavor.name.toLowerCase();
            const existing = marmitaMap.get(key);
            const flavorSides = getFlavorSides(flavor.name);

            if (existing) {
              existing.totalQuantity += flavor.quantity;
              existing.proteinWeight += flavor.quantity * PROTEIN_WEIGHT;
              existing.sides.forEach(side => {
                side.totalWeight += flavor.quantity * side.weightPerUnit;
              });
              
              const customerIndex = existing.customers.findIndex(c => c.name === order.customer_name);
              if (customerIndex >= 0) {
                existing.customers[customerIndex].quantity += flavor.quantity;
              } else {
                existing.customers.push({ name: order.customer_name, quantity: flavor.quantity });
              }
            } else {
              marmitaMap.set(key, {
                flavorName: flavor.name,
                category: flavor.category || 'carnes',
                totalQuantity: flavor.quantity,
                proteinWeight: flavor.quantity * PROTEIN_WEIGHT,
                sides: flavorSides.map(s => ({
                  name: s.name,
                  weightPerUnit: s.weight,
                  totalWeight: flavor.quantity * s.weight,
                })),
                customers: [{ name: order.customer_name, quantity: flavor.quantity }],
              });
            }
          }
        }

        // Check for juice/soup items by name/type
        const itemNameLower = item.name.toLowerCase();
        
        if (itemNameLower.includes('suco') || item.type === 'juice') {
          const juice = kitJuices.find(j => 
            itemNameLower.includes(j.name.toLowerCase()) || 
            j.name.toLowerCase().includes(itemNameLower.replace('suco', '').trim())
          );
          if (juice) {
            const key = juice.name;
            const existing = juiceMap.get(key);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              juiceMap.set(key, { emoji: juice.emoji, name: juice.name, quantity: item.quantity });
            }
          }
        }

        if (itemNameLower.includes('sopa') || item.type === 'soup') {
          const soup = kitSoups.find(s => 
            itemNameLower.includes(s.name.toLowerCase()) ||
            s.name.toLowerCase().includes(itemNameLower.replace('sopa', '').trim())
          );
          if (soup) {
            const key = soup.name;
            const existing = soupMap.get(key);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              soupMap.set(key, { emoji: soup.emoji, name: soup.name, quantity: item.quantity });
            }
          }
        }
      }
    }

    // Sort by category and quantity
    const marmitas = Array.from(marmitaMap.values()).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return b.totalQuantity - a.totalQuantity;
    });

    const juices = Array.from(juiceMap.values()).sort((a, b) => b.quantity - a.quantity);
    const soups = Array.from(soupMap.values()).sort((a, b) => b.quantity - a.quantity);

    const totals = {
      marmitas: marmitas.reduce((sum, m) => sum + m.totalQuantity, 0),
      juices: juices.reduce((sum, j) => sum + j.quantity, 0),
      soups: soups.reduce((sum, s) => sum + s.quantity, 0),
    };

    return { marmitas, juices, soups, totals };
  }, [filteredOrders, marmitaFlavors, kitJuices, kitSoups]);

  const handlePrint = () => {
    const today = formatDateShort(new Date().toISOString());
    printProductionPanel({
      marmitas: productionData.marmitas,
      juices: productionData.juices,
      soups: productionData.soups,
      totals: productionData.totals,
      date: today,
    });
  };

  const handleShareWhatsApp = () => {
    const today = formatDateShort(new Date().toISOString());
    const text = generateWhatsAppProductionText({
      marmitas: productionData.marmitas,
      juices: productionData.juices,
      soups: productionData.soups,
      totals: productionData.totals,
      date: today,
    });
    shareViaWhatsApp(text);
  };

  const categoryLabels: Record<string, string> = {
    carnes: "🥩 Carnes",
    frangos: "🍗 Frangos",
    massas: "🍝 Massas/Escondidinhos",
    especiais: "✨ Especiais",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupedMarmitas = productionData.marmitas.reduce((acc, item) => {
    const cat = item.category || 'carnes';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ProductionItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Produção do Dia</h2>
            <p className="text-sm text-muted-foreground">
              {filteredOrders.length} pedidos • {productionData.totals.marmitas + productionData.totals.juices + productionData.totals.soups} itens
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="production">Em Produção</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="preparing">Preparando</SelectItem>
              <SelectItem value="ready">Prontos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleShareWhatsApp}>
            <Share2 className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Totals Bar */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-around text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{productionData.totals.marmitas}</div>
              <div className="text-sm text-muted-foreground">Marmitas</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-bold text-green-600">{productionData.totals.juices}</div>
              <div className="text-sm text-muted-foreground">Sucos</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <div className="text-2xl font-bold text-orange-600">{productionData.totals.soups}</div>
              <div className="text-sm text-muted-foreground">Sopas</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marmitas Section */}
      {productionData.marmitas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🥩 Marmitas</span>
              <Badge variant="secondary">{productionData.totals.marmitas} un</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedMarmitas).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{item.flavorName}</h4>
                        <Badge>{item.totalQuantity}x</Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground mb-3">
                        <div>⚖️ Proteína: {item.totalQuantity} × 150g = {item.proteinWeight}g</div>
                        {item.sides.map((side, sIdx) => (
                          <div key={sIdx}>
                            ⚖️ {side.name}: {item.totalQuantity} × {side.weightPerUnit}g = {side.totalWeight}g
                          </div>
                        ))}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        👥 {item.customers.map(c => `${c.name} (${c.quantity})`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Juices Section */}
      {productionData.juices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🥤 Sucos Detox</span>
              <Badge variant="secondary">{productionData.totals.juices} un</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {productionData.juices.map((juice, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>{juice.emoji} {juice.name}</span>
                  <Badge variant="outline">{juice.quantity} un</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Soups Section */}
      {productionData.soups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🥣 Sopas</span>
              <Badge variant="secondary">{productionData.totals.soups} un</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {productionData.soups.map((soup, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span>{soup.emoji} {soup.name}</span>
                  <Badge variant="outline">{soup.quantity} un</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {productionData.totals.marmitas === 0 && 
       productionData.totals.juices === 0 && 
       productionData.totals.soups === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium text-lg mb-2">Nenhum item para produção</h3>
            <p className="text-muted-foreground">
              Não há pedidos aprovados ou em preparação no período selecionado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductionPanel;
