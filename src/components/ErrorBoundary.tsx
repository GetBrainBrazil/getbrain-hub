import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global. Captura erros de render em qualquer página
 * e mostra uma tela amigável em vez de deixar o app virar uma página
 * branca (o que faria o usuário perder o que estava preenchendo).
 *
 * Os rascunhos persistentes (localStorage) continuam intactos.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log para console — útil para debug no preview/produção.
    console.error("[ErrorBoundary] erro capturado:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4 rounded-lg border bg-card p-8 shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Algo deu errado nesta tela</h2>
              <p className="text-sm text-muted-foreground">
                Não se preocupe — o que você estava preenchendo foi salvo
                automaticamente como rascunho. Tente novamente.
              </p>
            </div>
            {this.state.error?.message && (
              <pre className="text-xs text-left bg-muted p-3 rounded overflow-auto max-h-32 text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" onClick={this.handleReset} className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Tentar novamente
              </Button>
              <Button onClick={this.handleReload}>Recarregar página</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
