import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const navigate = useNavigate();

  // Check for valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // The URL will have the access_token in the hash fragment
        // Supabase client automatically handles this
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setError("Link inválido ou expirado. Por favor, solicite um novo link de recuperação.");
          setCheckingSession(false);
          return;
        }

        if (session) {
          setIsValidSession(true);
        } else {
          // Try to exchange the hash params for a session
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          if (type === 'recovery' && accessToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (setSessionError) {
              console.error("Set session error:", setSessionError);
              setError("Link inválido ou expirado. Por favor, solicite um novo link de recuperação.");
            } else {
              setIsValidSession(true);
            }
          } else {
            setError("Link inválido ou expirado. Por favor, solicite um novo link de recuperação.");
          }
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setError("Erro ao verificar sessão. Tente novamente.");
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const validatePassword = () => {
    if (password.length < 6) {
      return "A senha deve ter pelo menos 6 caracteres";
    }
    if (password !== confirmPassword) {
      return "As senhas não coincidem";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePassword();
    if (validationError) {
      toast({
        title: "Erro de validação",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi redefinida com sucesso.",
      });

      // Redirect to admin after 3 seconds
      setTimeout(() => {
        navigate("/admin");
      }, 3000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Link inválido</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              {error}
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate("/admin")}
            >
              Voltar para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <CardTitle>Senha redefinida!</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              Sua senha foi atualizada com sucesso. Você será redirecionado para o login em instantes...
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate("/admin")}
            >
              Ir para login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Redefinir senha</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Digite sua nova senha abaixo
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {password && password.length > 0 && password.length < 6 && (
              <p className="text-xs text-destructive">
                A senha deve ter pelo menos 6 caracteres
              </p>
            )}

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">
                As senhas não coincidem
              </p>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || password.length < 6 || password !== confirmPassword}
            >
              {isLoading ? "Redefinindo..." : "Redefinir senha"}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar para login
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminResetPassword;
