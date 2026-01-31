import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, LogOut, Edit2, Package, MapPin, Phone, Mail, User, Check, X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Logo from '@/components/Logo';
import { useCashback } from '@/hooks/useCashback';
import CashbackCard from '@/components/minha-conta/CashbackCard';
import CashbackHistory from '@/components/minha-conta/CashbackHistory';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  preferred_delivery_option: string | null;
  preferred_address: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  items: unknown;
  created_at: string;
  delivery_option: string;
  delivery_address: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
  awaiting_payment: { label: 'Aguardando Pagamento', color: 'bg-orange-100 text-orange-800', icon: '💳' },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: '✅' },
  preparing: { label: 'Em Preparo', color: 'bg-blue-100 text-blue-800', icon: '👨‍🍳' },
  ready: { label: 'Pronto', color: 'bg-purple-100 text-purple-800', icon: '📦' },
  delivered: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-800', icon: '🚀' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌' },
};

const MinhaConta = () => {
  const { user, session, loading: authLoading, signOut, signInWithOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login state
  const [email, setEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    preferred_address: '',
  });
  const [saving, setSaving] = useState(false);

  // Cashback data
  const cashbackData = useCashback(profile?.email);

  // Fetch profile when user is logged in
  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchOrders();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        name: data.name || '',
        phone: data.phone || '',
        preferred_address: data.preferred_address || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, items, created_at, delivery_option, delivery_address')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Digite seu email para receber o link de acesso.',
        variant: 'destructive',
      });
      return;
    }

    setSendingLink(true);
    const { error } = await signInWithOtp(email);
    setSendingLink(false);

    if (error) {
      toast({
        title: 'Erro ao enviar link',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setLinkSent(true);
    toast({
      title: 'Link enviado! 📧',
      description: 'Verifique sua caixa de entrada e clique no link para acessar.',
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          phone: editForm.phone,
          preferred_address: editForm.preferred_address,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Dados atualizados! ✅',
        description: 'Suas informações foram salvas com sucesso.',
      });
      setIsEditing(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getOrderItemsSummary = (items: unknown) => {
    if (!Array.isArray(items)) return 'Itens não disponíveis';
    return (items as Array<{ quantity: number; name: string }>)
      .map((item) => `${item.quantity}x ${item.name}`)
      .join(', ');
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Login screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background">
        <div className="container max-w-md mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar</span>
            </Link>
            <Logo />
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Minha Conta</CardTitle>
              <CardDescription>
                {linkSent 
                  ? 'Verifique seu email e clique no link para acessar'
                  : 'Digite seu email para receber um link de acesso'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkSent ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="h-10 w-10 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enviamos um link de acesso para <strong>{email}</strong>
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLinkSent(false)}
                  >
                    Usar outro email
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMagicLink()}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSendMagicLink}
                    disabled={sendingLink}
                  >
                    {sendingLink ? 'Enviando...' : 'Enviar link de acesso'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Você receberá um link seguro no seu email para acessar sua conta
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-light/30 to-background">
      <div className="container max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Início</span>
          </Link>
          <Logo />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  👋 Olá, {profile?.name?.split(' ')[0] || 'Cliente'}!
                </CardTitle>
                <CardDescription className="mt-1">
                  {profile?.email}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingProfile ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço preferido</Label>
                  <Input
                    id="address"
                    value={editForm.preferred_address}
                    onChange={(e) => setEditForm({ ...editForm, preferred_address: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving} className="flex-1">
                    <Check className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {profile.phone}
                  </div>
                )}
                {profile?.preferred_address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.preferred_address}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cashback Section */}
        <CashbackCard cashbackData={cashbackData} />

        {/* Cashback History */}
        {cashbackData.transactions.length > 0 && (
          <CashbackHistory transactions={cashbackData.transactions} />
        )}

        {/* Orders Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Meus Pedidos
          </h2>

          {loadingOrders ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="border-0 shadow">
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <Card className="border-0 shadow">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Você ainda não fez nenhum pedido</p>
                <Button asChild className="mt-4">
                  <Link to="/">Ver Cardápio</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                return (
                  <Card key={order.id} className="border-0 shadow hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-semibold text-primary">
                            #{order.order_number || order.id.slice(0, 8)}
                          </span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {getOrderItemsSummary(order.items)}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">
                          R$ {order.total.toFixed(2).replace('.', ',')}
                        </span>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/pedido/${order.order_number || order.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Detalhes
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MinhaConta;
