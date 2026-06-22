import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useTenantId } from "@/hooks/useTenantId";
import { supabase } from "@/integrations/supabase/client";
import { getUTMParams } from "@/lib/utm";
import { validateCPF, formatCPF } from "@/lib/cpf";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PixPaymentModal from "@/components/PixPaymentModal";
import { ShoppingCart, Plus, Minus, Trash2, MessageCircle, CreditCard, Smartphone, ArrowLeft, ArrowRight, Loader2, Check, X, Tag, ChevronDown } from "lucide-react";

interface SiteCartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMore: () => void;
}

const SiteCartDrawer = ({ open, onOpenChange, onAddMore }: SiteCartDrawerProps) => {
  const navigate = useNavigate();
  const { items, updateItemQuantity, removeItem, getTotal, customerInfo } = useCart();
  const { contact } = useTenantConfig();
  const tenantId = useTenantId();

  const [step, setStep] = useState<"cart" | "payment">("cart");
  const [cpfInput, setCpfInput] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [isLoadingPix, setIsLoadingPix] = useState(false);
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [isLoadingWhats, setIsLoadingWhats] = useState(false);

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  const [pixModal, setPixModal] = useState<{
    open: boolean;
    qrCode: string;
    qrCodeBase64: string;
    paymentId: string;
    orderId: string;
    expirationDate: string;
    total: number;
  }>({ open: false, qrCode: "", qrCodeBase64: "", paymentId: "", orderId: "", expirationDate: "", total: 0 });

  const total = getTotal();
  const totalWithDiscount = couponDiscount > 0 ? total - (total * couponDiscount / 100) : total;
  const whatsappNumber = contact.whatsapp || "";

  const buildWhatsAppMessage = () => {
    let msg = "Olá! Quero pedir:%0A";
    items.forEach((item, i) => {
      msg += `${i + 1}. ${item.name} - ${item.quantity}x R$ ${item.totalPrice.toFixed(2).replace(".", ",")}%0A`;
    });
    msg += `%0ATotal: R$ ${totalWithDiscount.toFixed(2).replace(".", ",")}`;
    if (couponDiscount > 0) msg += `%0ADesconto: ${couponDiscount}%`;
    if (customerInfo.name) msg += `%0ANome: ${customerInfo.name}`;
    if (customerInfo.phone) msg += `%0ATel: ${customerInfo.phone}`;
    return msg;
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const { data, error } = await supabase.functions.invoke("validate-coupon", {
        body: { code, tenant_id: tenantId, total },
      });
      if (error) throw error;
      if (data?.valid && data?.discount_percent > 0) {
        setCouponDiscount(data.discount_percent);
        setCouponApplied(true);
        setCouponOpen(false);
      } else {
        setCouponError(data?.message || "Cupom inválido ou expirado");
      }
    } catch (err) {
      console.error("Erro cupom:", err);
      setCouponError("Erro ao validar cupom. Tente novamente.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponApplied(false);
    setCouponError("");
  };

  const handleWhatsAppPayment = () => {
    if (!whatsappNumber || items.length === 0) return;
    setIsLoadingWhats(true);
    window.open(`https://wa.me/${whatsappNumber}?text=${buildWhatsAppMessage()}`, "_blank");
    setIsLoadingWhats(false);
  };

  const handlePixPayment = async () => {
    const cleanedCpf = cpfInput.replace(/\D/g, "");
    if (cleanedCpf.length !== 11 || !validateCPF(cleanedCpf)) {
      setCpfError("CPF inválido");
      return;
    }
    setCpfError("");
    setIsLoadingPix(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("create-asaas-pix", {
        body: {
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            type: item.type,
          })),
          customer: {
            name: customerInfo.name || "Cliente",
            email: customerInfo.email || "",
            phone: customerInfo.phone || "",
            cpf: cleanedCpf,
          },
          delivery: { option: "pickup", address: null, fee: 0, scheduled_date: null },
          utm_data: getUTMParams(),
          tenant_id: tenantId,
          coupon_code: couponApplied ? couponCode : undefined,
          discount_amount: couponDiscount > 0 ? (total * couponDiscount / 100) : undefined,
        },
      });
      if (error) throw error;
      if (response?.qr_code && response?.qr_code_base64) {
        setPixModal({
          open: true,
          qrCode: response.qr_code,
          qrCodeBase64: response.qr_code_base64,
          paymentId: response.payment_id,
          orderId: response.order_id,
          expirationDate: response.expiration_date,
          total: response.total || totalWithDiscount,
        });
      } else {
        throw new Error("Resposta PIX inválida");
      }
    } catch (err) {
      console.error("Erro PIX:", err);
      setCpfError("Erro ao gerar PIX. Tente novamente ou use WhatsApp.");
    } finally {
      setIsLoadingPix(false);
    }
  };

  const handlePixPaymentSuccess = (orderNumber: string) => {
    setPixModal((prev) => ({ ...prev, open: false }));
    onOpenChange(false);
    navigate(`/pagamento/sucesso?order_id=${orderNumber}`);
  };

  const handlePixPaymentFailed = () => {
    setPixModal((prev) => ({ ...prev, open: false }));
  };

  const handleCardPayment = async () => {
    setIsLoadingCard(true);
    try {
      const currentOrigin = window.location.origin;
      const { data: response, error } = await supabase.functions.invoke("create-infinitepay-checkout", {
        body: {
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            type: item.type,
          })),
          customer: {
            name: customerInfo.name || "Cliente",
            email: customerInfo.email || "",
            phone: customerInfo.phone || "",
            cpf: cpfInput.replace(/\D/g, "") || undefined,
          },
          delivery: { option: "pickup", address: null, fee: 0, scheduled_date: null, notes: "" },
          utm_data: getUTMParams(),
          tenant_id: tenantId,
          coupon_code: couponApplied ? couponCode : undefined,
          discount_amount: couponDiscount > 0 ? (total * couponDiscount / 100) : undefined,
          success_url: `${currentOrigin}/pagamento/sucesso`,
          cancel_url: currentOrigin,
        },
      });
      if (error) throw error;
      if (response?.checkout_url) {
        window.open(response.checkout_url, "_self");
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (err) {
      console.error("Erro Cartão:", err);
      alert("Erro ao processar. Tente WhatsApp.");
    } finally {
      setIsLoadingCard(false);
    }
  };

  const resetToCart = () => {
    setStep("cart");
    setCpfInput("");
    setCpfError("");
    setCouponOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) resetToCart(); onOpenChange(isOpen); }}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              {step !== "cart" && (
                <button onClick={resetToCart} className="mr-1">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <ShoppingCart className="w-5 h-5 text-primary" />
              {step === "payment" ? "Forma de Pagamento" : "Seu Carrinho"}
            </SheetTitle>
          </SheetHeader>

          {step === "cart" && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Carrinho vazio</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateItemQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <p className="font-semibold text-sm text-primary whitespace-nowrap">
                          R$ {item.totalPrice.toFixed(2).replace(".", ",")}
                        </p>
                        <button onClick={() => removeItem(item.id)} className="text-destructive/70 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="border-t px-4 py-4 space-y-3 shrink-0">
                  <div className="flex items-center justify-between text-base">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-xl text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <Button className="w-full h-12 text-base gap-2" onClick={() => setStep("payment")}>
                    Finalizar Pedido <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={onAddMore}>
                    <Plus className="w-4 h-4" /> Adicionar mais itens
                  </Button>
                </div>
              )}
            </>
          )}

          {step === "payment" && (
            <div className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
              <p className="text-center text-sm text-muted-foreground mb-2">
                Total: <strong className="text-foreground text-lg">R$ {total.toFixed(2).replace(".", ",")}</strong>
                {couponDiscount > 0 && (
                  <span className="block text-sm text-green-600 font-medium">
                    {couponDiscount}% OFF → R$ {totalWithDiscount.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </p>

              {/* Coupon */}
              <div className="bg-muted/30 rounded-xl border p-3">
                {couponApplied ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Cupom {couponCode} ({couponDiscount}% OFF)</span>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex items-center justify-between w-full text-sm font-medium"
                      onClick={() => setCouponOpen(!couponOpen)}
                    >
                      <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> Cupom de desconto</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${couponOpen ? "rotate-180" : ""}`} />
                    </button>
                    {couponOpen && (
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder="Digite o cupom"
                          value={couponCode}
                          onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                          className="h-10 text-sm"
                        />
                        <Button size="sm" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                          {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                        </Button>
                      </div>
                    )}
                    {couponError && <p className="text-xs text-destructive mt-2">{couponError}</p>}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">CPF (obrigatório para PIX e Cartão)</label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={(e) => { setCpfInput(formatCPF(e.target.value)); setCpfError(""); }}
                  className="h-12 text-base"
                />
                {cpfError && <p className="text-xs text-destructive">{cpfError}</p>}
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  className="w-full h-14 text-base gap-3 justify-start px-5"
                  variant="outline"
                  onClick={handlePixPayment}
                  disabled={isLoadingPix || isLoadingCard || isLoadingWhats}
                >
                  {isLoadingPix ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5 text-green-600" />}
                  Pagar com PIX
                </Button>

                <Button
                  className="w-full h-14 text-base gap-3 justify-start px-5"
                  variant="outline"
                  onClick={handleCardPayment}
                  disabled={isLoadingCard || isLoadingPix || isLoadingWhats}
                >
                  {isLoadingCard ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 text-blue-600" />}
                  Pagar com Cartão
                </Button>

                <Button
                  className="w-full h-14 text-base gap-3 justify-start px-5"
                  variant="outline"
                  onClick={handleWhatsAppPayment}
                  disabled={isLoadingWhats || isLoadingPix || isLoadingCard}
                >
                  {isLoadingWhats ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5 text-green-600" />}
                  Finalizar no WhatsApp
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">Pagamento 100% seguro</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <PixPaymentModal
        open={pixModal.open}
        onOpenChange={(isOpen) => setPixModal((prev) => ({ ...prev, open: isOpen }))}
        qrCode={pixModal.qrCode}
        qrCodeBase64={pixModal.qrCodeBase64}
        total={pixModal.total}
        paymentId={pixModal.paymentId}
        orderId={pixModal.orderId}
        expirationDate={pixModal.expirationDate}
        onPaymentSuccess={handlePixPaymentSuccess}
        onPaymentFailed={handlePixPaymentFailed}
      />
    </>
  );
};

export default SiteCartDrawer;
