import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";

interface Field {
  key: string;
  label: string;
  type: "text" | "textarea";
}

interface SectionEditorProps {
  items: Record<string, any>[];
  fields: Field[];
  onUpdate: (items: Record<string, any>[]) => void;
  addLabel?: string;
}

export function SectionEditor({ items, fields, onUpdate, addLabel = "Adicionar" }: SectionEditorProps) {
  const addItem = () => {
    const newItem: Record<string, any> = {};
    fields.forEach((f) => (newItem[f.key] = ""));
    onUpdate([...items, newItem]);
  };

  const removeItem = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, key: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: value };
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card key={index} className="relative">
          <CardContent className="pt-4 pb-3 space-y-2">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 mt-2.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 space-y-2">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={item[field.key] || ""}
                        onChange={(e) => updateItem(index, field.key, e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        value={item[field.key] || ""}
                        onChange={(e) => updateItem(index, field.key, e.target.value)}
                        className="text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive flex-shrink-0"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        {addLabel}
      </Button>
    </div>
  );
}
