import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, MessageCircle, ShoppingBag, Loader2, ArrowLeft, Smartphone, Pencil } from "lucide-react";
import { useCart, CartItem, FlavorSelection } from "./CartContext";
import { hapticFeedback } from "@/lib/haptics";
import { celebrateCheckout } from "@/lib/confetti";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams } from "@/lib/utm";
import { useNavigate } from "react-router-dom";
import FlavorSelectionModal from "./FlavorSelectionModal";
import KitFlavorSelectionModal from "./KitFlavorSelectionModal";
import { toast } from "@/hooks/use-toast";
import { useMarmitaFlavors, useKitJuices, useKitSoups } from "@/hooks/useMenuData";

const WHATSAPP_NUMBER = "5577991001658";

// Phone mask function: (XX) XXXXX-XXXX
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  deliveryOption: z.enum(["pickup", "delivery"]),
  address: z.string().optional(),
  saveData: z.boolean().optional(),
}).refine((data) => {
  if (data.deliveryOption === "delivery" && (!data.address || data.address.length < 10)) {
    return false;
  }
  return true;
}, {
  message: "Endereço completo é obrigatório para entrega",
  path: ["address"],
});

type FormData = z.infer<typeof formSchema>;

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}

const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const { items, removeItem, updateItemFlavors, getTotal, clearCart } = useCart();
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [isLoading, setIsLoading] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [editingMarmita, setEditingMarmita] = useState<CartItem | null>(null);
  const [editingKit, setEditingKit] = useState<CartItem | null>(null);
  const navigate = useNavigate();

  // Fetch menu data from database
  const { data: flavorsData } = useMarmitaFlavors();
  const { data: juicesData } = useKitJuices();
  const { data: soupsData } = useKitSoups();

  // Process flavors by category for the modal (FlavorCategory[] format)
  const flavorsByCategory = useMemo(() => {
    if (!flavorsData) return undefined;
    
    const categoryMap: Record<string, string[]> = {
      carnes: [],
      frangos: [],
      massas: [],
      especiais: [],
    };

    flavorsData.forEach((flavor) => {
      const category = flavor.category.toLowerCase();
      if (categoryMap[category]) {
        categoryMap[category].push(flavor.name);
      }
    });

    const categoryNames: Record<string, string> = {
      carnes: "Carnes",
      frangos: "Frangos",
      massas: "Massas",
      especiais: "Especiais",
    };

    return Object.entries(categoryMap)
      .filter(([_, flavors]) => flavors.length > 0)
      .map(([id, flavors]) => ({
        id,
        name: categoryNames[id] || id,
        flavors,
      }));
  }, [flavorsData]);

  // Process stock data for the modal
  const flavorStockData = useMemo(() => {
    if (!flavorsData) return undefined;
    
    return flavorsData.map((flavor) => ({
      name: flavor.name,
      stock_quantity: flavor.stock_quantity,
      show_stock: flavor.show_stock,
      low_stock_threshold: flavor.low_stock_threshold,
    }));
  }, [flavorsData]);

  // Process juice data for kit modal
  const juiceFlavorsData = useMemo(() => {
    if (!juicesData) return undefined;
    
    return juicesData.map((juice) => ({
      emoji: juice.emoji,
      name: juice.name,
      description: juice.ingredients || "",
      stock_quantity: juice.stock_quantity,
      show_stock: juice.show_stock,
      low_stock_threshold: juice.low_stock_threshold,
    }));
  }, [juicesData]);

  // Process soup data for kit modal
  const soupFlavorsData = useMemo(() => {
    if (!soupsData) return undefined;
    
    return soupsData.map((soup) => ({
      emoji: soup.emoji,
      name: soup.name,
      description: soup.ingredients || "",
      stock_quantity: soup.stock_quantity,
      show_stock: soup.show_stock,
      low_stock_threshold: soup.low_stock_threshold,
    }));
  }, [soupsData]);
  const getKitDays = (kitName: string): number => {
    if (kitName.includes("3 Dias")) return 3;
    if (kitName.includes("5 Dias")) return 5;
    if (kitName.includes("7 Dias")) return 7;
    return 3; // default
  };

  // Get kit quantities based on days
  const getKitQuantities = (days: number) => ({
    juices: days * 4,
    soups: days * 2,
  });

  const createCustomerAccount = async (data: FormData) => {
    if (!saveData) return;
    
    try {
      const { data: response, error } = await supabase.functions.invoke('create-customer-account', {
        body: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          deliveryOption: data.deliveryOption,
          address: data.address,
        },
      });

      if (error) {
        console.error('Error creating account:', error);
        return;
      }

      if (response?.success) {
        toast({
          title: response.isExisting ? "Dados atualizados!" : "Conta criada!",
          description: "Enviamos um link de acesso para seu email.",
        });
      }
    } catch (error) {
      console.error('Error creating customer account:', error);
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryOption: "pickup",
    },
  });

  const deliveryOption = watch("deliveryOption");
  const deliveryFee = deliveryOption === "delivery" ? 10 : 0;
  const subtotal = getTotal();
  const total = subtotal + deliveryFee;

  const handleProceedToCheckout = () => {
    hapticFeedback('light');
    setSaveData(false); // Reset checkbox
    setStep('checkout');
  };

  const handleBackToCart = () => {
    setStep('cart');
  };

  const handlePixPayment = async (data: FormData) => {
    setIsLoading(true);
    hapticFeedback('medium');

    // Create account if checkbox is checked
    await createCustomerAccount(data);

    // Track InitiateCheckout
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: total,
        currency: 'BRL',
        num_items: items.length,
      });
    }

    try {
      const { data: response, error } = await supabase.functions.invoke('create-mp-preference', {
        body: {
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            type: item.type,
            flavors: item.flavors?.map(f => ({
              name: f.name,
              quantity: f.quantity,
              category: f.category,
            })),
          })),
          customer: {
            name: data.name,
            email: data.email,
            phone: data.phone,
          },
          delivery: {
            option: data.deliveryOption,
            address: data.address,
            fee: deliveryFee,
          },
          utm_data: getUTMParams(),
        },
      });

      if (error) throw error;

      if (response?.init_point) {
        window.location.href = response.init_point;
      } else {
        throw new Error('No init_point received');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Erro ao criar pagamento. Tente novamente ou finalize via WhatsApp.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsApp = async (data: FormData) => {
    hapticFeedback('medium');
    celebrateCheckout();

    // Create account if checkbox is checked
    await createCustomerAccount(data);

    // Track InitiateCheckout for WhatsApp too
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        value: total,
        currency: 'BRL',
        num_items: items.length,
      });
    }

    // Create order in database with whatsapp_pending status
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'whatsapp_pending',
          payment_method: 'whatsapp',
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            type: item.type,
            flavors: item.flavors?.map(f => ({
              name: f.name,
              quantity: f.quantity,
              category: f.category,
            })),
          })),
          subtotal,
          delivery_fee: deliveryFee,
          total,
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.phone,
          delivery_option: data.deliveryOption,
          delivery_address: data.address || null,
          utm_data: getUTMParams() || null,
        });

      if (orderError) {
        console.error('Error creating WhatsApp order:', orderError);
      }
    } catch (error) {
      console.error('Error saving WhatsApp order:', error);
    }

    // Build WhatsApp message with flavors
    const itemsList = items
      .map(item => {
        let itemText = `• ${item.name} - R$ ${item.totalPrice.toFixed(2).replace(".", ",")}`;
        if (item.flavors && item.flavors.length > 0) {
          const flavorsList = item.flavors
            .map(f => `   → ${f.quantity}x ${f.name}`)
            .join("\n");
          itemText += `\n${flavorsList}`;
        }
        return itemText;
      })
      .join("\n");

    const deliveryText = data.deliveryOption === "pickup" 
      ? "📍 Retirada no local" 
      : `🛵 Entrega (+R$ 10)\n📍 ${data.address}`;

    const message = `🥗 *NOVO PEDIDO - Dieta Já*\n\n` +
      `👤 *Cliente:* ${data.name}\n` +
      `📱 *Telefone:* ${data.phone}\n\n` +
      `📦 *Itens:*\n${itemsList}\n\n` +
      `${deliveryText}\n\n` +
      `💰 *Subtotal:* R$ ${subtotal.toFixed(2).replace(".", ",")}\n` +
      (deliveryFee > 0 ? `🚚 *Entrega:* R$ ${deliveryFee.toFixed(2).replace(".", ",")}\n` : "") +
      `✅ *Total:* R$ ${total.toFixed(2).replace(".", ",")}`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    // Clear cart and close drawer
    setTimeout(() => {
      clearCart();
      reset();
      setStep('cart');
      onOpenChange(false);
      navigate("/obrigado");
    }, 100);
  };

  // Reset step when drawer closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('cart');
      setEditingMarmita(null);
      setEditingKit(null);
    }
    onOpenChange(newOpen);
  };

  const handleEditFlavors = (item: CartItem) => {
    hapticFeedback('light');
    if (item.type === "kit") {
      setEditingKit(item);
    } else {
      setEditingMarmita(item);
    }
  };

  const handleMarmitaFlavorEditConfirm = (flavors: FlavorSelection[]) => {
    if (editingMarmita) {
      updateItemFlavors(editingMarmita.id, flavors);
      setEditingMarmita(null);
    }
  };

  const handleKitFlavorEditConfirm = (juiceFlavors: FlavorSelection[], soupFlavors: FlavorSelection[]) => {
    if (editingKit) {
      const allFlavors = [...juiceFlavors, ...soupFlavors];
      updateItemFlavors(editingKit.id, allFlavors);
      setEditingKit(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          {step === 'checkout' && (
            <button 
              onClick={handleBackToCart}
              className="absolute left-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <SheetTitle className="flex items-center gap-2 justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
            {step === 'cart' ? 'Seu Carrinho' : 'Finalizar Pedido'}
          </SheetTitle>
        </SheetHeader>

        {/* Step 1: Cart View */}
        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Seu carrinho está vazio</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Adicione kits detox ou marmitas para começar
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-4 rounded-xl bg-muted/30 border border-border"
                    >
                      <div className="flex-1">
                        <span className="text-xs uppercase tracking-wide text-primary font-medium">
                          {item.type === "kit" ? "Kit Detox" : "Marmitas"}
                        </span>
                        <h4 className="font-semibold text-foreground mt-1">{item.name}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        {item.type === "marmita" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.quantity}x R$ {item.unitPrice.toFixed(2).replace(".", ",")}
                          </p>
                        )}
                        {/* Display selected flavors */}
                        {item.flavors && item.flavors.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            <p className="text-xs font-medium text-foreground">Sabores:</p>
                            {item.flavors.map((flavor, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                • {flavor.quantity}x {flavor.name}
                              </p>
                            ))}
                          </div>
                        )}
                        {/* Edit flavors button for marmitas and kits */}
                        {(item.type === "marmita" || (item.type === "kit" && item.flavors && item.flavors.length > 0)) && (
                          <button
                            onClick={() => handleEditFlavors(item)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar sabores
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-primary">
                          R$ {item.totalPrice.toFixed(2).replace(".", ",")}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <SheetFooter className="flex-col gap-4 border-t border-border pt-4">
                <div className="flex justify-between items-center w-full">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {subtotal.toFixed(2).replace(".", ",")}
                  </span>
                </div>
                
                <Button
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={handleProceedToCheckout}
                >
                  Finalizar pedido
                </Button>
                
                <button
                  onClick={clearCart}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Limpar carrinho
                </button>
              </SheetFooter>
            )}
          </>
        )}

        {/* Step 2: Checkout Form */}
        {step === 'checkout' && (
          <>
            <div className="flex-1 overflow-y-auto py-4">
              <form className="space-y-4">
                {/* Customer data */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="drawer-name" className="text-sm font-medium">
                      Nome completo
                    </Label>
                    <Input
                      id="drawer-name"
                      placeholder="Seu nome"
                      {...register("name")}
                      className="mt-1"
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="drawer-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="drawer-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...register("email")}
                      className="mt-1"
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="drawer-phone" className="text-sm font-medium">
                      WhatsApp
                    </Label>
                    <Input
                      id="drawer-phone"
                      type="tel"
                      placeholder="(77) 99100-1658"
                      {...register("phone", {
                        onChange: (e) => {
                          e.target.value = formatPhone(e.target.value);
                        }
                      })}
                      className="mt-1"
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Delivery option */}
                <div className="pt-2">
                  <Label className="text-sm font-medium">Entrega ou retirada</Label>
                  <RadioGroup
                    defaultValue="pickup"
                    onValueChange={(value) => {
                      const event = { target: { name: "deliveryOption", value } };
                      register("deliveryOption").onChange(event as React.ChangeEvent<HTMLInputElement>);
                    }}
                    className="mt-2 space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-sage-light/30 border border-transparent hover:border-primary/30 transition-colors">
                      <RadioGroupItem value="pickup" id="drawer-pickup" />
                      <Label htmlFor="drawer-pickup" className="flex-1 cursor-pointer">
                        <span className="font-medium">📍 Retirada grátis</span>
                        <span className="text-sm text-muted-foreground block">Bairro Recreio</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-transparent hover:border-primary/30 transition-colors">
                      <RadioGroupItem value="delivery" id="drawer-delivery" />
                      <Label htmlFor="drawer-delivery" className="flex-1 cursor-pointer">
                        <span className="font-medium">🛵 Entrega</span>
                        <span className="text-sm text-muted-foreground ml-2">+ R$ 10,00</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Address (conditional) */}
                {deliveryOption === "delivery" && (
                  <div>
                    <Label htmlFor="drawer-address" className="text-sm font-medium">
                      Endereço completo
                    </Label>
                    <Input
                      id="drawer-address"
                      placeholder="Rua, número, bairro"
                      {...register("address")}
                      className="mt-1"
                    />
                    {errors.address && (
                      <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
                    )}
                  </div>
                )}

                {/* Save data checkbox */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Checkbox
                    id="drawer-saveData"
                    checked={saveData}
                    onCheckedChange={(checked) => setSaveData(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="drawer-saveData" className="text-sm cursor-pointer leading-relaxed">
                    <span className="font-medium">Salvar meus dados para próximas compras</span>
                    <span className="text-muted-foreground block text-xs mt-0.5">
                      Criaremos uma conta e enviaremos um link de acesso para seu email
                    </span>
                  </Label>
                </div>

                {/* Order summary */}
                <div className="pt-3 border-t border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Resumo do pedido</p>
                  <div className="space-y-1 text-sm">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground truncate pr-2">{item.name}</span>
                        <span>R$ {item.totalPrice.toFixed(2).replace(".", ",")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="pt-3 border-t border-border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entrega</span>
                      <span>R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-1">
                    <span>Total</span>
                    <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </form>
            </div>

            <SheetFooter className="flex-col gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="cta"
                size="lg"
                className="w-full"
                onClick={handleSubmit(handlePixPayment)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Smartphone className="w-5 h-5" />
                    Pagar via PIX
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleSubmit(handleWhatsApp)}
                disabled={isLoading}
              >
                <MessageCircle className="w-5 h-5" />
                Finalizar via WhatsApp
              </Button>
            </SheetFooter>
          </>
        )}

        {/* Marmita Flavor Edit Modal */}
        <FlavorSelectionModal
          isOpen={!!editingMarmita}
          onClose={() => setEditingMarmita(null)}
          onConfirm={handleMarmitaFlavorEditConfirm}
          packageName={editingMarmita?.name || ""}
          packageQuantity={editingMarmita?.quantity || 0}
          flavorsByCategory={flavorsByCategory}
          flavorStockData={flavorStockData}
        />

        {/* Kit Flavor Edit Modal */}
        {editingKit && (
          <KitFlavorSelectionModal
            isOpen={!!editingKit}
            onClose={() => setEditingKit(null)}
            onConfirm={handleKitFlavorEditConfirm}
            kitName={editingKit.name}
            juiceQuantity={getKitQuantities(getKitDays(editingKit.name)).juices}
            soupQuantity={getKitQuantities(getKitDays(editingKit.name)).soups}
            initialJuiceFlavors={editingKit.flavors?.filter(f => f.category === "Suco")}
            initialSoupFlavors={editingKit.flavors?.filter(f => f.category === "Sopa")}
            juiceFlavorsData={juiceFlavorsData}
            soupFlavorsData={soupFlavorsData}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
