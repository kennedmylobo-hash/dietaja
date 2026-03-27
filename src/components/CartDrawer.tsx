import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, MessageCircle, ShoppingBag, Loader2, ArrowLeft, Smartphone, Pencil, CheckCircle2, Mail, Tag, X, User, CreditCard } from "lucide-react";
import { useCart, CartItem, FlavorSelection } from "./CartContext";
import { hapticFeedback } from "@/lib/haptics";
import { celebrateCheckout } from "@/lib/confetti";
// Force rebuild v2: Asaas PIX integration - 2026-01-23
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams } from "@/lib/utm";
import { useNavigate, Link } from "react-router-dom";
import FlavorSelectionModal from "./FlavorSelectionModal";
import KitFlavorSelectionModal from "./KitFlavorSelectionModal";
import PixPaymentModal from "./PixPaymentModal";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useMarmitaFlavors, useKitJuices, useKitSoups } from "@/hooks/useMenuData";
import { motion, AnimatePresence } from "framer-motion";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { validateCPF, formatCPF } from "@/lib/cpf";
import { sanitizeCustomerName } from "@/lib/name-sanitizer";
import { useTenantId } from "@/hooks/useTenantId";

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
  const { brand, contact, location: tenantLocation } = useTenantConfig();
  const { items, removeItem, updateItemFlavors, getTotal, clearCart, trackCartOpen, trackCheckoutStart, trackCheckoutComplete, customerInfo, setCustomerInfo, markCartAsConverted } = useCart();
  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmation' | 'success'>('cart');
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const promoCouponApplied = useRef(false);
  
  // PIX inline state
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    paymentId: string;
    orderId: string;
    expirationDate: string;
    total: number;
  } | null>(null);
  
  // CPF state for PIX payment
  const [cpfValue, setCpfValue] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [showCpfInput, setShowCpfInput] = useState(false);
  
  const handleGoToCheckout = () => {
    setStep('checkout');
    trackCheckoutStart();
  };
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [isLoadingWhatsApp, setIsLoadingWhatsApp] = useState(false);
  const [saveData, setSaveData] = useState(false);
  const [editingMarmita, setEditingMarmita] = useState<CartItem | null>(null);
  const [editingKit, setEditingKit] = useState<CartItem | null>(null);
  const navigate = useNavigate();
  const tenantId = useTenantId();

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

  // Always create/update customer account on order confirmation
  const createCustomerAccount = async (data: FormData) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('create-customer-account', {
        body: {
          email: data.email,
          name: data.name,
          phone: data.phone,
          deliveryOption: data.deliveryOption,
          address: data.address,
          tenant_id: tenantId,
        },
      });

      if (error) {
        console.error('Error creating account:', error);
        return;
      }

      if (response?.success) {
        console.log(response.isExisting ? 'Customer data updated' : 'Customer account created');
      }
    } catch (error) {
      console.error('Error creating customer account:', error);
    }
  };

  // Format phone for display
  const formatPhoneForDisplay = (phone: string) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    getValues,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryOption: "pickup",
      name: customerInfo.name || "",
      phone: formatPhoneForDisplay(customerInfo.phone) || "",
    },
  });

  // Pre-fill form with customer info when step changes to checkout
  useEffect(() => {
    if (step === 'checkout' && customerInfo.name) {
      setValue('name', customerInfo.name);
    }
    if (step === 'checkout' && customerInfo.phone) {
      setValue('phone', formatPhoneForDisplay(customerInfo.phone));
    }
    if (step === 'checkout' && customerInfo.email) {
      setValue('email', customerInfo.email);
    }
  }, [step, customerInfo, setValue]);

  // Auto-apply promo coupon from URL param when entering checkout
  useEffect(() => {
    if (step === 'checkout' && !promoCouponApplied.current && !appliedCoupon) {
      const promoCoupon = localStorage.getItem('promo_coupon');
      if (promoCoupon) {
        setCouponCode(promoCoupon);
        promoCouponApplied.current = true;
        // Auto-validate after a short delay to let email field populate
        const timer = setTimeout(async () => {
          const email = getValues("email");
          if (!email) return;
          try {
            const { data: response } = await supabase.functions.invoke('validate-coupon', {
              body: { code: promoCoupon, customer_email: email, subtotal: getTotal(), tenant_id: tenantId },
            });
            if (response?.valid) {
              setCouponDiscount(response.discount_amount);
              setCouponMessage(response.message);
              setAppliedCoupon(promoCoupon);
              hapticFeedback('success');
              toast({ title: "🎉 Cupom promocional aplicado!", description: response.message });
            }
          } catch (e) {
            console.error('Auto-apply promo coupon error:', e);
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [step, appliedCoupon]);

  const deliveryOption = watch("deliveryOption");
  const deliveryFee = deliveryOption === "delivery" ? tenantLocation.deliveryFee : 0;
  const subtotal = getTotal();
  const total = subtotal + deliveryFee - couponDiscount;

  // Validate coupon function
  const handleApplyCoupon = async () => {
    const email = getValues("email");
    if (!couponCode.trim()) {
      setCouponError("Digite um código de cupom");
      return;
    }
    if (!email) {
      setCouponError("Preencha o email primeiro");
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError("");
    setCouponMessage("");

    try {
      const { data: response, error } = await supabase.functions.invoke('validate-coupon', {
        body: {
          code: couponCode,
          customer_email: email,
          subtotal: subtotal,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      if (response?.valid) {
        setCouponDiscount(response.discount_amount);
        setCouponMessage(response.message);
        setAppliedCoupon(couponCode.toUpperCase());
        hapticFeedback('success');
        toast({
          title: "Cupom aplicado!",
          description: response.message,
        });
      } else {
        setCouponError(response?.message || "Cupom inválido");
        setCouponDiscount(0);
        setAppliedCoupon("");
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponError("Erro ao validar cupom. Tente novamente.");
      setCouponDiscount(0);
      setAppliedCoupon("");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Remove coupon function
  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponMessage("");
    setCouponError("");
    setAppliedCoupon("");
    hapticFeedback('light');
  };

  const handleProceedToCheckout = () => {
    hapticFeedback('light');
    setSaveData(false); // Reset checkbox
    handleGoToCheckout();
  };

  const handleBackToCart = () => {
    setStep('cart');
  };

  const handleBackToCheckout = () => {
    setStep('checkout');
  };

  // NEW: Go to confirmation step
  const handleGoToConfirmation = (data: FormData) => {
    const sanitizedData = { ...data, name: sanitizeCustomerName(data.name) };
    setFormData(sanitizedData);
    setStep('confirmation');
  };

  // Insert order with automatic retry (up to 2 attempts)
  const insertOrderWithRetry = async (payload: any, maxRetries = 2) => {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const { data, error } = await supabase
        .from('orders')
        .insert(payload)
        .select('order_number, id')
        .single();

      if (!error && data) return { data, error: null };

      lastError = error;
      console.warn(`Order insert attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return { data: null, error: lastError };
  };

  // Log checkout failure to payment_error_logs for admin diagnosis
  const logCheckoutError = async (error: unknown, context: Record<string, unknown>) => {
    try {
      await supabase.from('payment_error_logs').insert({
        tenant_id: tenantId,
        error_code: 'CHECKOUT_INSERT',
        error_message: error instanceof Error ? error.message : String(error),
        provider: 'checkout',
        customer_email: formData?.email || null,
        customer_phone: formData?.phone || null,
        request_payload: context as any,
        response_payload: (error && typeof error === 'object' && 'details' in error ? error : { raw: String(error) }) as any,
      });
    } catch (logErr) {
      console.error('Failed to log checkout error:', logErr);
    }
  };

  // NEW: Confirm order - OPTIMIZED with retry + error logging
  const handleConfirmOrder = async () => {
    if (!formData) return;
    
    setIsConfirming(true);
    hapticFeedback('medium');

    try {
      // InitiateCheckout is tracked in CartContext.tsx (single source)

      // Create account in background (don't wait)
      createCustomerAccount(formData).catch(err => 
        console.error('Background account creation error:', err)
      );

      const orderPayload = {
        tenant_id: tenantId,
        status: 'awaiting_payment',
        payment_method: 'pending',
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          type: item.type,
          lineType: item.lineType || null,
          flavors: item.flavors?.map(f => ({
            name: f.name,
            quantity: f.quantity,
            category: f.category,
          })),
        })),
        subtotal,
        delivery_fee: deliveryFee,
        total,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        delivery_option: formData.deliveryOption,
        delivery_address: formData.address || null,
        utm_data: getUTMParams() || null,
        coupon_code: appliedCoupon || null,
        discount_amount: couponDiscount,
      };

      // Save order with retry logic (2 attempts, 1s delay between)
      const { data: orderData, error: orderError } = await insertOrderWithRetry(orderPayload);

      if (orderError || !orderData) {
        console.error('Error creating order after retries:', orderError);
        
        // Log the error persistently for admin diagnosis
        await logCheckoutError(orderError, {
          error_source: 'checkout_insert',
          customer_name: formData.name,
          total,
          items_count: items.length,
        });
        
        toast({
          title: "Erro ao confirmar pedido",
          description: "Ocorreu um problema. Toque para tentar novamente.",
          variant: "destructive",
          action: (
            <ToastAction altText="Tentar novamente" onClick={() => handleConfirmOrder()}>
              Tentar novamente
            </ToastAction>
          ),
          duration: 15000,
        });
        setIsConfirming(false);
        return;
      }

      const orderNumber = orderData.order_number;
      setConfirmedOrderNumber(orderNumber);

      // Record coupon usage in background (don't wait)
      if (appliedCoupon) {
        Promise.all([
          supabase.from('coupon_usage').insert({
            coupon_code: appliedCoupon,
            customer_email: formData.email.toLowerCase(),
            order_id: null,
          }),
          supabase.rpc('increment_coupon_usage', { coupon_code_param: appliedCoupon }),
        ]).catch(err => console.error('Background coupon usage error:', err));
      }

      // Update customer info immediately (sync, but fast)
      if (formData.email && !customerInfo.email) {
        setCustomerInfo({
          ...customerInfo,
          email: formData.email,
        });
      }

      // Mark cart as converted in background (don't wait)
      markCartAsConverted().catch(err => 
        console.error('Background cart conversion error:', err)
      );

      // Track checkout complete
      trackCheckoutComplete(total);
      celebrateCheckout();

      // Go to success step
      setStep('success');
    } catch (error) {
      console.error('Error confirming order:', error);
      
      // Log unexpected errors too
      await logCheckoutError(error, {
        error_source: 'checkout_unexpected',
        customer_name: formData?.name,
        total,
      });
      
      toast({
        title: "Erro ao confirmar pedido",
        description: "Ocorreu um problema inesperado. Toque para tentar novamente.",
        variant: "destructive",
        action: (
          <ToastAction altText="Tentar novamente" onClick={() => handleConfirmOrder()}>
            Tentar novamente
          </ToastAction>
        ),
        duration: 15000,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Local formatCpf and validateCpf removed - using shared lib/cpf

  const handlePixPayment = async (retryCount = 0) => {
    if (!formData) return;
    
    // CPF é obrigatório para PIX (Asaas exige)
    const cleanedCpf = cpfValue.replace(/\D/g, '');
    
    if (!cleanedCpf || cleanedCpf.length !== 11) {
      setCpfError('CPF é obrigatório para pagamento PIX');
      return;
    }
    
    if (!validateCPF(cleanedCpf)) {
      setCpfError('CPF inválido. Verifique os números.');
      return;
    }
    
    setCpfError("");
    setIsLoadingPix(true);
    hapticFeedback('medium');

    try {
      const { data: response, error } = await supabase.functions.invoke('create-asaas-pix', {
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
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            cpf: cleanedCpf,
          },
          delivery: {
            option: formData.deliveryOption,
            address: formData.address,
            fee: deliveryFee,
          },
          utm_data: getUTMParams(),
          coupon_code: appliedCoupon || null,
          discount_amount: couponDiscount,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      if (response?.qr_code && response?.qr_code_base64) {
        // Set PIX data and show modal
        setPixData({
          qrCode: response.qr_code,
          qrCodeBase64: response.qr_code_base64,
          paymentId: response.payment_id,
          orderId: response.order_id,
          expirationDate: response.expiration_date,
          total: response.total,
        });
        setShowPixModal(true);
        
        // WhatsApp is now sent in background by the edge function - no need to send again here
        console.log('✅ PIX modal shown - WhatsApp sent by edge function in background');
      } else {
        throw new Error('No PIX data received');
      }
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      
      // Silent auto-retry up to 3 times - don't show errors to customer
      if (retryCount < 3) {
        console.log(`Retrying PIX generation (attempt ${retryCount + 2}/4)...`);
        await new Promise(r => setTimeout(r, 1500 + (retryCount * 500)));
        return handlePixPayment(retryCount + 1);
      }
      
      // After all retries failed, check if CPF-related
      const errorMsg = String(error);
      const isCpfError = errorMsg.includes('cpf') || errorMsg.includes('CPF');
      toast({
        title: isCpfError ? "CPF inválido" : "Ops! Tente novamente",
        description: isCpfError 
          ? "Verifique o CPF informado e tente novamente." 
          : "Clique no botão PIX para tentar novamente ou fale com um atendente.",
      });
    } finally {
      setIsLoadingPix(false);
    }
  };

  const handleCardPayment = async () => {
    if (!formData || isLoadingCard) return;
    
    setIsLoadingCard(true);
    hapticFeedback('medium');

    try {
      const currentOrigin = window.location.origin;
      const redirectUrl = `${currentOrigin}/pagamento/sucesso`;

      const { data: response, error } = await supabase.functions.invoke('create-infinitepay-checkout', {
        body: {
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            type: item.type,
            lineType: item.lineType || null,
            flavors: item.flavors?.map(f => ({
              name: f.name,
              quantity: f.quantity,
              category: f.category,
            })),
          })),
          customer: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          },
          delivery: {
            option: formData.deliveryOption,
            address: formData.address,
            fee: deliveryFee,
          },
          coupon_code: appliedCoupon || null,
          discount_amount: couponDiscount,
          redirect_url: redirectUrl,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      if (response?.success && response?.checkout_url) {
        clearCart();
        const opened = window.open(response.checkout_url, '_self');
        if (!opened) {
          window.open(response.checkout_url, '_blank');
        }
      } else {
        throw new Error(response?.error || 'Erro ao gerar link de pagamento');
      }
    } catch (error) {
      console.error('Error creating card payment:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePixPaymentSuccess = (orderNumber: string) => {
    setShowPixModal(false);
    setConfirmedOrderNumber(orderNumber);
    clearCart();
    navigate(`/pagamento/sucesso?order_id=${pixData?.orderId}`);
  };

  const handlePixPaymentFailed = () => {
    setShowPixModal(false);
    toast({
      title: "PIX expirado ou não aprovado",
      description: "Gere um novo PIX ou fale com um atendente.",
      variant: "destructive",
    });
  };

  const handleWhatsAppContact = async () => {
    if (!formData) return;
    hapticFeedback('medium');
    setIsLoadingWhatsApp(true);

    try {
      // Update order status to whatsapp_pending
      if (confirmedOrderNumber) {
        await supabase
          .from('orders')
          .update({ 
            status: 'whatsapp_pending',
            payment_method: 'whatsapp'
          })
          .eq('order_number', confirmedOrderNumber);
      }

      // Build WhatsApp message with order details
      const total = getTotal();
      const deliveryFee = formData.deliveryOption === 'delivery' ? (tenantLocation.deliveryFee || 0) : 0;
      const finalTotal = total - couponDiscount + deliveryFee;

      let message = `Oi 😊\nVi o site da *${brand.name}* e quero fazer meu pedido.\n\n`;
      message += `👤 *DADOS:*\n`;
      message += `Nome: ${formData.name}\n`;
      message += `WhatsApp: ${formData.phone}\n`;
      message += `Email: ${formData.email}\n`;
      message += `Opção: ${formData.deliveryOption === 'pickup' ? `Retirada` : 'Entrega em domicílio'}\n`;
      if (formData.address) {
        message += `Endereço: ${formData.address}\n`;
      }
      if (confirmedOrderNumber) {
        message += `Pedido: #${confirmedOrderNumber}\n`;
      }
      message += `\n🛒 *CARRINHO:*\n`;

      items.forEach((item) => {
        if (item.type === "kit") {
          message += `📦 ${item.name} - R$ ${item.totalPrice.toFixed(2).replace(".", ",")}\n`;
        } else {
          message += `🍱 ${item.name} (${item.quantity} marmitas) - R$ ${item.totalPrice.toFixed(2).replace(".", ",")}\n`;
        }
        // Add flavor details
        if (item.flavors && item.flavors.length > 0) {
          item.flavors.forEach(f => {
            message += `   • ${f.name} x${f.quantity}\n`;
          });
        }
      });

      message += `\n💰 *SUBTOTAL:* R$ ${total.toFixed(2).replace(".", ",")}\n`;
      if (couponDiscount > 0) {
        message += `🏷️ *DESCONTO:* -R$ ${couponDiscount.toFixed(2).replace(".", ",")}\n`;
      }
      if (deliveryFee > 0) {
        message += `🛵 *ENTREGA:* R$ ${deliveryFee.toFixed(2).replace(".", ",")}\n`;
      }
      message += `✅ *TOTAL:* R$ ${finalTotal.toFixed(2).replace(".", ",")}\n`;
      message += `\n⏳ *Aguardando confirmação de pagamento*\n\nPode me confirmar o pedido?`;

      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${contact.whatsapp}?text=${encodedMessage}`, "_blank");

      // Close drawer and go to thank you page
      handleCloseAfterSuccess();
    } catch (error) {
      console.error('Error in handleWhatsAppContact:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAfterSuccess = () => {
    clearCart();
    reset();
    setStep('cart');
    setConfirmedOrderNumber("");
    setFormData(null);
    // Reset coupon state
    setCouponCode("");
    setCouponDiscount(0);
    setCouponMessage("");
    setCouponError("");
    setAppliedCoupon("");
    onOpenChange(false);
    navigate("/obrigado");
  };

  // Reset step when drawer closes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      trackCartOpen();
    } else {
      setStep('cart');
      setEditingMarmita(null);
      setEditingKit(null);
      setConfirmedOrderNumber("");
      setFormData(null);
      // Reset coupon state on close
      setCouponCode("");
      setCouponDiscount(0);
      setCouponMessage("");
      setCouponError("");
      setAppliedCoupon("");
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

  const handleMarmitaFlavorEditConfirm = (flavors: FlavorSelection[], fishAdditional: number) => {
    if (editingMarmita) {
      updateItemFlavors(editingMarmita.id, flavors, fishAdditional);
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

  const getStepTitle = () => {
    switch (step) {
      case 'cart': return 'Seu Carrinho';
      case 'checkout': return 'Dados do Pedido';
      case 'confirmation': return 'Confirmar Pedido';
      case 'success': return 'Quase Lá!';
      default: return 'Seu Carrinho';
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          {(step === 'checkout' || step === 'confirmation') && (
            <button 
              onClick={step === 'confirmation' ? handleBackToCheckout : handleBackToCart}
              className="absolute left-4 top-4 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <SheetTitle className="flex items-center gap-2 justify-center">
            {step === 'success' ? (
              <ShoppingBag className="w-5 h-5 text-amber-500" />
            ) : (
              <ShoppingBag className="w-5 h-5 text-primary" />
            )}
            {getStepTitle()}
          </SheetTitle>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Cart View */}
          {step === 'cart' && (
            <motion.div
              key="cart"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Seu carrinho está vazio</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Adicione kits detox ou marmitas para começar
                    </p>
                    <Link 
                      to="/minha-conta" 
                      className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      onClick={() => handleOpenChange(false)}
                    >
                      <User className="w-4 h-4" />
                      Acessar Minha Conta
                    </Link>
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
                          {/* Display fish additional if any */}
                          {item.fishAdditional && item.fishAdditional > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              + R$ {item.fishAdditional.toFixed(2).replace(".", ",")} (adicional peixe)
                            </p>
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
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-bold text-primary">
                            R$ {(item.totalPrice + (item.fishAdditional || 0)).toFixed(2).replace(".", ",")}
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
            </motion.div>
          )}

          {/* Step 2: Checkout Form */}
          {step === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
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
                          <span className="text-sm text-muted-foreground block">{tenantLocation.pickupNeighborhood || 'Local de retirada'}</span>
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

                  {/* Coupon section */}
                  <div className="pt-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Cupom de desconto
                    </Label>
                    <div className="mt-2 flex gap-2">
                      {appliedCoupon ? (
                        <div className="flex-1 flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">{appliedCoupon}</span>
                            <span className="text-xs text-green-600">
                              (-R$ {couponDiscount.toFixed(2).replace(".", ",")})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="p-1 hover:bg-green-100 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-green-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Input
                            placeholder="Digite o cupom"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleApplyCoupon}
                            disabled={isValidatingCoupon}
                          >
                            {isValidatingCoupon ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Aplicar"
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                    {couponError && (
                      <p className="text-xs text-destructive mt-1">{couponError}</p>
                    )}
                    {couponMessage && !couponError && (
                      <p className="text-xs text-green-600 mt-1">{couponMessage}</p>
                    )}
                  </div>

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
                </form>
              </div>

              <SheetFooter className="flex-col gap-3 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={handleSubmit(handleGoToConfirmation)}
                >
                  Revisar Pedido
                </Button>
              </SheetFooter>
            </motion.div>
          )}

          {/* Step 3: Confirmation Review */}
          {step === 'confirmation' && formData && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-4">
                  {/* Customer info summary */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Seus Dados</h4>
                    <p className="text-sm"><strong>👤</strong> {formData.name}</p>
                    <p className="text-sm"><strong>📧</strong> {formData.email}</p>
                    <p className="text-sm"><strong>📱</strong> {formData.phone}</p>
                    <p className="text-sm mt-2">
                      {formData.deliveryOption === "pickup" 
                        ? "📍 Retirada no local - Bairro Recreio"
                        : `🛵 Entrega - ${formData.address}`
                      }
                    </p>
                  </div>

                  {/* Items summary */}
                  <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Itens do Pedido</h4>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.flavors && item.flavors.length > 0 && (
                              <div className="mt-1">
                                {item.flavors.slice(0, 3).map((f, idx) => (
                                  <p key={idx} className="text-xs text-muted-foreground">
                                    • {f.quantity}x {f.name}
                                  </p>
                                ))}
                                {item.flavors.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    + {item.flavors.length - 3} mais...
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-medium">
                            R$ {(item.totalPrice + (item.fishAdditional || 0)).toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="space-y-1">
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
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Desconto ({appliedCoupon})</span>
                          <span>-R$ {couponDiscount.toFixed(2).replace(".", ",")}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-primary/20">
                        <span>Total</span>
                        <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Email notice */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                    <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      Ao confirmar, enviaremos os detalhes do pedido para <strong>{formData.email}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <SheetFooter className="flex-col gap-3 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={handleConfirmOrder}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirmar Pedido
                    </>
                  )}
                </Button>
              </SheetFooter>
            </motion.div>
          )}

          {/* Step 4: Success - Awaiting Payment */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
                {/* Pending animation - amber/orange theme */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-4"
                >
                  <ShoppingBag className="w-12 h-12 text-amber-500" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-1">Obaaa, estamos quase lá!</h2>
                  <p className="text-base text-muted-foreground mb-4">
                    Faça o pagamento para finalizar seu pedido
                  </p>
                  
                  <div className="inline-block px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                    <p className="text-xs text-amber-700">Pedido reservado para você</p>
                    <p className="text-xl font-bold text-amber-600">#{confirmedOrderNumber}</p>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    Seu pedido está a um passo de ser confirmado!
                  </p>

                  {/* Important warning */}
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4">
                    <p className="text-sm text-amber-800 font-medium">
                      ⚠️ Importante: Seu pedido só será confirmado após o pagamento
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="w-full space-y-3"
                >
                  {/* CPF - obrigatório para PIX */}
                  <div className="space-y-1">
                    <Label htmlFor="cpf-drawer" className="text-sm font-medium">
                      CPF <span className="text-muted-foreground text-xs">(exigido pelo PIX)</span>
                    </Label>
                    <Input
                      id="cpf-drawer"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={formatCPF(cpfValue)}
                      onChange={(e) => {
                        setCpfValue(e.target.value);
                        setCpfError("");
                      }}
                      className={cpfError ? 'border-destructive' : ''}
                    />
                    {cpfError && <p className="text-xs text-destructive">{cpfError}</p>}
                  </div>

                  <Button
                    variant="cta"
                    size="lg"
                    className="w-full"
                    onClick={() => handlePixPayment()}
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
                    variant="outline"
                    size="lg"
                    className="w-full border-primary/30 hover:bg-primary/5"
                    onClick={handleCardPayment}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Pagar via Cartão de Crédito
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={handleWhatsAppContact}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5" />
                        Finalizar no WhatsApp
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    asChild
                  >
                    <a href={`/pedido/${confirmedOrderNumber}`}>
                      📦 Acompanhar Pedido
                    </a>
                  </Button>

                  <button
                    onClick={handleCloseAfterSuccess}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
                  >
                    Fechar
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Marmita Flavor Edit Modal */}
        <FlavorSelectionModal
          isOpen={!!editingMarmita}
          onClose={() => setEditingMarmita(null)}
          onConfirm={(flavors, fishAdditional) => {
            if (editingMarmita) {
              updateItemFlavors(editingMarmita.id, flavors, fishAdditional);
              setEditingMarmita(null);
            }
          }}
          packageName={editingMarmita?.name || ""}
          packageQuantity={editingMarmita?.quantity || 0}
          packageUnitPrice={editingMarmita?.unitPrice || 0}
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

        {/* PIX Payment Modal */}
        {pixData && (
          <PixPaymentModal
            open={showPixModal}
            onOpenChange={setShowPixModal}
            qrCode={pixData.qrCode}
            qrCodeBase64={pixData.qrCodeBase64}
            total={pixData.total}
            paymentId={pixData.paymentId}
            orderId={pixData.orderId}
            expirationDate={pixData.expirationDate}
            onPaymentSuccess={handlePixPaymentSuccess}
            onPaymentFailed={handlePixPaymentFailed}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
