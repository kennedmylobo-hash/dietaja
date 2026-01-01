import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    
    // Track error with Meta Pixel if available
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('trackCustom', 'Error', {
        error_message: error.message,
        error_stack: error.stack?.substring(0, 500)
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Ops! Algo deu errado
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Tivemos um problema ao carregar a página. Por favor, tente recarregar.
            </p>
            
            <Button 
              onClick={this.handleReload}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar página
            </Button>
            
            <p className="text-xs text-muted-foreground mt-8">
              Se o problema persistir, entre em contato pelo WhatsApp.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
