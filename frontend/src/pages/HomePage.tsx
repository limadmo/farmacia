import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Permission from '../components/Permission';
import {
  UserGroupIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ShoppingCartIcon,
  TagIcon,
  ChartBarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import { TipoUsuario } from '../types/auth';

export default function HomePage() {
  const { user } = useAuth();

  const modules = [
    { 
      name: 'Clientes', 
      description: 'Gestão de clientes com sistema de crédito',
      icon: UserGroupIcon,
      href: '/clientes',
      color: 'bg-blue-100 text-blue-800',
      iconColor: 'text-blue-500',
      requiredModule: 'clientes'
    },
    { 
      name: 'Fornecedores', 
      description: 'Cadastro e gestão de fornecedores',
      icon: BuildingStorefrontIcon,
      href: '/fornecedores',
      color: 'bg-green-100 text-green-800',
      iconColor: 'text-green-500',
      requiredModule: 'fornecedores'
    },
    { 
      name: 'Produtos', 
      description: 'Controle de produtos e medicamentos',
      icon: CubeIcon,
      href: '/produtos',
      color: 'bg-purple-100 text-purple-800',
      iconColor: 'text-purple-500',
      requiredModule: 'produtos'
    },
    { 
      name: 'Vendas', 
      description: 'Sistema de vendas e faturamento',
      icon: ShoppingCartIcon,
      href: '/vendas',
      color: 'bg-yellow-100 text-yellow-800',
      iconColor: 'text-yellow-500',
      requiredModule: 'vendas'
    },
    { 
      name: 'Promoções', 
      description: 'Gestão de ofertas e descontos',
      icon: TagIcon,
      href: '/promocoes',
      color: 'bg-pink-100 text-pink-800',
      iconColor: 'text-pink-500',
      requiredModule: 'promocoes'
    },
    { 
      name: 'Relatórios', 
      description: 'Análises e estatísticas',
      icon: ChartBarIcon,
      href: '/relatorios',
      color: 'bg-indigo-100 text-indigo-800',
      iconColor: 'text-indigo-500',
      requiredModule: 'relatorios'
    },
    { 
      name: 'Usuários', 
      description: 'Gerenciamento de usuários',
      icon: UserIcon,
      href: '/usuarios',
      color: 'bg-gray-100 text-gray-800',
      iconColor: 'text-gray-500',
      allowedRoles: ['ADMINISTRADOR', 'GERENTE'] as TipoUsuario[]
    }
  ];

  return (
    <Layout>
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Módulos do Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((module) => (
              <Permission
                key={module.name}
                requiredModule={module.requiredModule}
                allowedRoles={module.allowedRoles}
              >
                <Link
                  to={module.href}
                  className="block p-6 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center mb-3">
                    <div className={`p-2 rounded-lg ${module.color}`}>
                      <module.icon className={`h-6 w-6 ${module.iconColor}`} />
                    </div>
                    <h3 className="ml-3 text-lg font-medium text-gray-900">{module.name}</h3>
                  </div>
                  <p className="text-gray-600 text-sm">{module.description}</p>
                </Link>
              </Permission>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Permission requiredModule="produtos">
              <Link
                to="/produtos/novo"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <CubeIcon className="h-8 w-8 text-purple-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Novo Produto</span>
              </Link>
            </Permission>
            <Permission requiredModule="vendas">
              <Link
                to="/vendas/nova"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <ShoppingCartIcon className="h-8 w-8 text-green-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Nova Venda</span>
              </Link>
            </Permission>
            <Permission requiredModule="fornecedores">
              <Link
                to="/fornecedores/novo"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <BuildingStorefrontIcon className="h-8 w-8 text-blue-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Novo Fornecedor</span>
              </Link>
            </Permission>
            <Permission requiredModule="clientes">
              <Link
                to="/clientes/novo"
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <UserGroupIcon className="h-8 w-8 text-yellow-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Novo Cliente</span>
              </Link>
            </Permission>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Permission requiredModule="estoque">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Estoque Baixo</h2>
              <p className="text-gray-600 text-sm">Produtos que precisam de reposição</p>
              <div className="mt-4">
                <Link
                  to="/produtos?estoqueMinimo=true"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Ver Produtos
                </Link>
              </div>
            </div>
          </Permission>

          <Permission requiredModule="produtos">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Medicamentos Controlados</h2>
              <p className="text-gray-600 text-sm">Gerenciamento de medicamentos controlados</p>
              <div className="mt-4">
                <Link
                  to="/produtos?exigeReceita=true"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ver Medicamentos
                </Link>
              </div>
            </div>
          </Permission>

          <Permission requiredModule="vendas">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Nova Venda</h2>
              <p className="text-gray-600 text-sm">Iniciar uma nova venda</p>
              <div className="mt-4">
                <Link
                  to="/vendas/nova"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Iniciar Venda
                </Link>
              </div>
            </div>
          </Permission>
        </div>
      </div>
    </Layout>
  );
}