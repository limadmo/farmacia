/**
 * Componente para controle de acesso granular na interface
 * 
 * Permite mostrar/ocultar elementos baseado em permissões,
 * tipos de usuário ou módulos específicos.
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { TipoUsuario } from '../types/auth';

interface PermissionProps {
  children: React.ReactNode;
  requiredRole?: TipoUsuario;
  allowedRoles?: TipoUsuario[];
  requiredModule?: string;
  requiredPermission?: string;
  fallback?: React.ReactNode;
  adminOnly?: boolean;
}

const Permission: React.FC<PermissionProps> = ({
  children,
  requiredRole,
  allowedRoles,
  requiredModule,
  requiredPermission,
  fallback = null,
  adminOnly = false
}) => {
  const { user, canAccess, hasPermission } = useAuth();

  // Se não há usuário logado, não mostrar nada
  if (!user) {
    return <>{fallback}</>;
  }

  // Se é apenas para admin
  if (adminOnly && user.tipo !== 'ADMINISTRADOR') {
    return <>{fallback}</>;
  }

  // Se precisa de um role específico
  if (requiredRole && user.tipo !== requiredRole && user.tipo !== 'ADMINISTRADOR') {
    return <>{fallback}</>;
  }

  // Se tem uma lista de roles permitidos
  if (allowedRoles && !allowedRoles.includes(user.tipo) && user.tipo !== 'ADMINISTRADOR') {
    return <>{fallback}</>;
  }

  // Se precisa de acesso a um módulo específico
  if (requiredModule && !canAccess(requiredModule)) {
    return <>{fallback}</>;
  }

  // Se precisa de uma permissão específica
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  // Se passou por todas as verificações, mostrar o conteúdo
  return <>{children}</>;
};

export default Permission;