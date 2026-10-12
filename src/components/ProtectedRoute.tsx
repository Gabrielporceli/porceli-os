
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, session } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="min-h-screen bg-Porceli-dark flex items-center justify-center">
        <img src="/logo.png" alt="Carregando" className="logo-respirando h-16 w-16 object-contain" />
      </div>
    );
  }

  // Verificação robusta: se não está autenticado OU não tem sessão, redireciona
  if (!isAuthenticated || !session) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
