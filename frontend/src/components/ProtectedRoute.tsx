import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { TipoUsuario } from '../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: TipoUsuario;
  requiredModule?: string;
  requiredPermission?: string;
  allowedRoles?: TipoUsuario[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requiredModule,
  requiredPermission,
  allowedRoles
}) => {
  const { isAuthenticated, user, canAccess, hasPermission } = useAuth();

  // Se não estiver autenticado, redirecionar para login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se precisar de um role específico
  if (requiredRole && user?.tipo !== requiredRole && user?.tipo !== 'ADMINISTRADOR') {
    return <Navigate to="/" replace />;
  }

  // Se tiver uma lista de roles permitidos
  if (allowedRoles && !allowedRoles.includes(user?.tipo) && user?.tipo !== 'ADMINISTRADOR') {
    return <Navigate to="/" replace />;
  }

  // Se precisar de acesso a um módulo específico
  if (requiredModule && !canAccess(requiredModule)) {
    return <Navigate to="/" replace />;
  }

  // Se precisar de uma permissão específica
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
