
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Se usuário está logado, redirecionar para dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // Se usuário não está logado, redirecionar para login
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Mostrar loading enquanto verifica autenticação
  return (
    <div className="min-h-screen bg-porceli-dark flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-porceli-purple border-t-transparent rounded-full animate-spin" />
    </div>
  );
};

export default Index;
