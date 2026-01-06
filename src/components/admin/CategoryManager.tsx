import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUp, ArrowDown, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllMenuCategories, MenuCategory } from "@/hooks/useMenuCategories";
import { useQueryClient } from "@tanstack/react-query";

interface EditableCategory extends MenuCategory {
  isNew?: boolean;
  isModified?: boolean;
}

const CategoryManager = () => {
  const { data: fetchedCategories, isLoading } = useAllMenuCategories();
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (fetchedCategories) {
      setCategories(fetchedCategories.map(c => ({ ...c, isNew: false, isModified: false })));
    }
  }, [fetchedCategories]);

  const updateCategory = (id: string, field: keyof MenuCategory, value: any) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, [field]: value, isModified: true } : cat
      )
    );
  };

  const addCategory = () => {
    const newCategory: EditableCategory = {
      id: crypto.randomUUID(),
      slug: `nova-categoria-${Date.now()}`,
      name: "Nova Categoria",
      short_name: "Nova",
      icon: "📦",
      type: "marmita",
      sort_order: categories.length + 1,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isNew: true,
      isModified: true,
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const deleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    if (category.isNew) {
      setCategories(prev => prev.filter(c => c.id !== id));
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a categoria "${category.name}"?`)) return;

    try {
      const { error } = await supabase.from("menu_categories").delete().eq("id", id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success("Categoria excluída!");
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
    } catch (error) {
      toast.error("Erro ao excluir categoria");
      console.error(error);
    }
  };

  const moveCategory = (id: string, direction: "up" | "down") => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === categories.length - 1) return;

    const newCategories = [...categories];
    const swapIndex = direction === "up" ? index - 1 : index + 1;

    // Swap sort_order values
    const tempOrder = newCategories[index].sort_order;
    newCategories[index] = { ...newCategories[index], sort_order: newCategories[swapIndex].sort_order, isModified: true };
    newCategories[swapIndex] = { ...newCategories[swapIndex], sort_order: tempOrder, isModified: true };

    // Swap positions in array
    [newCategories[index], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[index]];

    setCategories(newCategories);
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const modifiedCategories = categories.filter(c => c.isModified);

      for (const cat of modifiedCategories) {
        const { isNew, isModified, ...categoryData } = cat;

        if (isNew) {
          const { error } = await supabase.from("menu_categories").insert(categoryData);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("menu_categories")
            .update({
              name: categoryData.name,
              short_name: categoryData.short_name,
              slug: categoryData.slug,
              icon: categoryData.icon,
              type: categoryData.type,
              sort_order: categoryData.sort_order,
              active: categoryData.active,
            })
            .eq("id", categoryData.id);
          if (error) throw error;
        }
      }

      toast.success("Categorias salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu-categories-all"] });
    } catch (error) {
      toast.error("Erro ao salvar categorias");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando categorias...</div>;
  }

  const hasChanges = categories.some(c => c.isModified);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Categorias do Menu</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addCategory}>
            <Plus className="h-4 w-4 mr-1" />
            Nova Categoria
          </Button>
          <Button size="sm" onClick={saveChanges} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Ordem</TableHead>
              <TableHead className="w-[80px]">Ícone</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Nome Curto</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="w-[80px]">Ativa</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category, index) => (
              <TableRow key={category.id} className={category.isModified ? "bg-yellow-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveCategory(category.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveCategory(category.id, "down")}
                      disabled={index === categories.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    value={category.icon || ""}
                    onChange={(e) => updateCategory(category.id, "icon", e.target.value)}
                    className="w-16 text-center text-lg"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={category.name}
                    onChange={(e) => updateCategory(category.id, "name", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={category.short_name}
                    onChange={(e) => updateCategory(category.id, "short_name", e.target.value)}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={category.slug}
                    onChange={(e) => updateCategory(category.id, "slug", e.target.value)}
                    className="w-32"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={category.type}
                    onValueChange={(value: "kit" | "marmita") => updateCategory(category.id, "type", value)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kit">Kit</SelectItem>
                      <SelectItem value="marmita">Marmita</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={category.active}
                    onCheckedChange={(checked) => updateCategory(category.id, "active", checked)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma categoria cadastrada. Clique em "Nova Categoria" para adicionar.
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
