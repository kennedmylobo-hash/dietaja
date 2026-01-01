import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Smartphone, MessageCircle } from "lucide-react";
import { useCart } from "./CartContext";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams } from "@/lib/utm";

const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido").max(15),
  deliveryOption: z.enum(["pickup", "delivery"]),
  address: z.string().optional(),
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

interface CheckoutFormProps {
  onWhatsAppClick: (customerData: { name: string; phone: string; deliveryOption: string; address?: string }) => void;
}

const CheckoutForm = ({ onWhatsAppClick }: CheckoutFormProps) => {
  const { items, getTotal } = useCart();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
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

  const handlePixPayment = async (data: FormData) => {
    setIsLoading(true);

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
        // Redirect to Mercado Pago checkout
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

  const handleWhatsApp = (data: FormData) => {
    onWhatsAppClick({
      name: data.name,
      phone: data.phone,
      deliveryOption: data.deliveryOption,
      address: data.address,
    });
  };

  const hasItems = items.length > 0;

  return (
    <form className="space-y-4">
      {/* Customer data */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Nome completo
          </Label>
          <Input
            id="name"
            placeholder="Seu nome"
            {...register("name")}
            className="mt-1"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
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
          <Label htmlFor="phone" className="text-sm font-medium">
            WhatsApp
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(77) 99100-1658"
            {...register("phone")}
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
            <RadioGroupItem value="pickup" id="pickup" />
            <Label htmlFor="pickup" className="flex-1 cursor-pointer">
              <span className="font-medium">📍 Retirada grátis</span>
              <span className="text-sm text-muted-foreground block">Bairro Recreio</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border border-transparent hover:border-primary/30 transition-colors">
            <RadioGroupItem value="delivery" id="delivery" />
            <Label htmlFor="delivery" className="flex-1 cursor-pointer">
              <span className="font-medium">🛵 Entrega</span>
              <span className="text-sm text-muted-foreground ml-2">+ R$ 10,00</span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Address (conditional) */}
      {deliveryOption === "delivery" && (
        <div>
          <Label htmlFor="address" className="text-sm font-medium">
            Endereço completo
          </Label>
          <Input
            id="address"
            placeholder="Rua, número, bairro"
            {...register("address")}
            className="mt-1"
          />
          {errors.address && (
            <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
          )}
        </div>
      )}

      {/* Totals */}
      {hasItems && (
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
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          type="button"
          variant="cta"
          size="lg"
          className="w-full"
          onClick={handleSubmit(handlePixPayment)}
          disabled={!hasItems || isLoading}
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
          disabled={!hasItems || isLoading}
        >
          <MessageCircle className="w-5 h-5" />
          Finalizar via WhatsApp
        </Button>
      </div>
    </form>
  );
};

export default CheckoutForm;
