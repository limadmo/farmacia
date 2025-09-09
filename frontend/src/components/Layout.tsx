import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { TipoUsuario } from '../types/auth';
import Permission from './Permission';
import {
  HomeIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ShoppingCartIcon,
  TagIcon,
  ChartBarIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  requiredModule?: string;
  allowedRoles?: TipoUsuario[];
}

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Tenta fazer logout normalmente
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, força a limpeza do localStorage e redireciona
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Clientes', href: '/clientes', icon: UserGroupIcon, requiredModule: 'clientes' },
    { name: 'Fornecedores', href: '/fornecedores', icon: BuildingStorefrontIcon, requiredModule: 'fornecedores' },
    { name: 'Produtos', href: '/produtos', icon: CubeIcon, requiredModule: 'produtos' },
    { name: 'Vendas', href: '/vendas', icon: ShoppingCartIcon, requiredModule: 'vendas' },
    { name: 'Promoções', href: '/promocoes', icon: TagIcon, requiredModule: 'promocoes' },
    { name: 'Estoque', href: '/estoque', icon: CubeIcon, requiredModule: 'estoque' },
    { name: 'Auditoria', href: '/auditoria', icon: ClipboardDocumentListIcon, allowedRoles: ['ADMINISTRADOR', 'GERENTE', 'FARMACEUTICO'] },
    { name: 'Relatórios', href: '/relatorios', icon: ChartBarIcon, requiredModule: 'relatorios' },
    { name: 'Usuários', href: '/usuarios', icon: UserIcon, requiredModule: 'usuarios' }
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Fechar menu</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <span className="text-xl font-bold text-blue-600">🏥 Farmácia</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                if (item.requiredModule || item.allowedRoles) {
                  return (
                    <Permission 
                      key={item.name} 
                      requiredModule={item.requiredModule}
                      allowedRoles={item.allowedRoles}
                    >
                      <Link
                        to={item.href}
                        className={`${
                          isActive(item.href)
                            ? 'bg-blue-100 text-blue-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon
                          className={`${
                            isActive(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          } mr-4 flex-shrink-0 h-6 w-6`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </Permission>
                  );
                } else {
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon
                        className={`${
                          isActive(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-4 flex-shrink-0 h-6 w-6`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  );
                }
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 group block">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">{user?.nome}</p>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-gray-500 group-hover:text-gray-700 flex items-center"
                  >
                    <ArrowRightOnRectangleIcon className="mr-1 h-4 w-4" />
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 w-14" aria-hidden="true">
          {/* Force sidebar to shrink to fit close icon */}
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <span className="text-xl font-bold text-blue-600">🏥 Sistema Farmácia</span>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {navigation.map((item) => {
                  if (item.requiredModule || item.allowedRoles) {
                    return (
                      <Permission 
                        key={item.name} 
                        requiredModule={item.requiredModule}
                        allowedRoles={item.allowedRoles}
                      >
                        <Link
                          to={item.href}
                          className={`${
                            isActive(item.href)
                              ? 'bg-blue-100 text-blue-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                        >
                          <item.icon
                            className={`${
                              isActive(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                            } mr-3 flex-shrink-0 h-6 w-6`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </Link>
                      </Permission>
                    );
                  } else {
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${
                          isActive(item.href)
                            ? 'bg-blue-100 text-blue-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                      >
                        <item.icon
                          className={`${
                            isActive(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          } mr-3 flex-shrink-0 h-6 w-6`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    );
                  }
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex-shrink-0 w-full group block">
                <div className="flex items-center">
                  <div className="ml-3 w-full">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{user?.nome}</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-700">{user?.tipoDescricao}</p>
                    <button
                      onClick={handleLogout}
                      className="mt-1 text-sm font-medium text-gray-500 group-hover:text-gray-700 flex items-center"
                    >
                      <ArrowRightOnRectangleIcon className="mr-1 h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Abrir menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <h1 className="text-xl font-semibold text-gray-900 self-center">
                {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
              </h1>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-gray-100" onClick={(e) => e.stopPropagation()}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;