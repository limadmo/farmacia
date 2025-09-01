import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import FornecedoresPage from './pages/FornecedoresPage';
import ProdutosPage from './pages/ProdutosPage';
import ClientesPage from './pages/ClientesPage';
import VendasPage from './pages/VendasPage';
import NovaVendaPage from './pages/NovaVendaPage';
import DetalhesVendaPage from './pages/DetalhesVendaPage';
import PromocoesPage from './pages/PromocoesPage';
import UsuariosPage from './pages/Usuarios';
import EstoquePage from './pages/EstoquePage';
import AuditoriaPage from './pages/AuditoriaPage';
import IconTestPage from './pages/IconTestPage';
import { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            } />
            <Route path="/fornecedores" element={
              <ProtectedRoute requiredModule="fornecedores">
                <FornecedoresPage />
              </ProtectedRoute>
            } />
            <Route path="/produtos" element={
              <ProtectedRoute requiredModule="produtos">
                <ProdutosPage />
              </ProtectedRoute>
            } />
            <Route path="/produtos/novo" element={
              <ProtectedRoute requiredModule="produtos">
                <ProdutosPage isNewProduct={true} />
              </ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute requiredModule="clientes">
                <ClientesPage />
              </ProtectedRoute>
            } />
            <Route path="/clientes/novo" element={
              <ProtectedRoute requiredModule="clientes">
                <ClientesPage isNewClient={true} />
              </ProtectedRoute>
            } />
            <Route path="/vendas" element={
              <ProtectedRoute requiredModule="vendas">
                <VendasPage />
              </ProtectedRoute>
            } />
            <Route path="/vendas/nova" element={
              <ProtectedRoute requiredModule="vendas">
                <NovaVendaPage />
              </ProtectedRoute>
            } />
            <Route path="/vendas/:id" element={
              <ProtectedRoute requiredModule="vendas">
                <DetalhesVendaPage />
              </ProtectedRoute>
            } />
            
            <Route path="/promocoes" element={
              <ProtectedRoute requiredModule="promocoes">
                <PromocoesPage />
              </ProtectedRoute>
            } />
            
            <Route path="/estoque" element={
              <ProtectedRoute requiredModule="estoque">
                <EstoquePage />
              </ProtectedRoute>
            } />
            
            <Route path="/usuarios" element={
              <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE']}>
                <UsuariosPage />
              </ProtectedRoute>
            } />
            
            <Route path="/auditoria" element={
              <ProtectedRoute allowedRoles={['ADMINISTRADOR', 'GERENTE', 'FARMACEUTICO']}>
                <AuditoriaPage />
              </ProtectedRoute>
            } />
            
            <Route path="/icon-test" element={
              <ProtectedRoute>
                <IconTestPage />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

function OldHomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">🏥 Sistema de Farmácia</h1>
          <p className="text-blue-100 mt-2">Sistema completo de controle e gestão</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">✅ Sistema Funcionando!</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-800 mb-2">🏗️ Backend</h3>
              <p className="text-green-600">API .NET 8 + PostgreSQL</p>
                              <p className="text-sm text-green-500 mt-1">Porta: 3001</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-800 mb-2">⚛️ Frontend</h3>
              <p className="text-blue-600">React 18 + TypeScript</p>
              <p className="text-sm text-blue-500 mt-1">Porta: 3000</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-purple-800 mb-2">🗄️ Banco</h3>
              <p className="text-purple-600">PostgreSQL 15</p>
              <p className="text-sm text-purple-500 mt-1">Porta: 5432</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">📋 Módulos do Sistema</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">👥 Clientes</h3>
              <p className="text-gray-600 text-sm">Gestão de clientes com sistema de crédito</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">📦 Estoque</h3>
              <p className="text-gray-600 text-sm">Controle de produtos e medicamentos</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">🏪 Fornecedores</h3>
              <p className="text-gray-600 text-sm">Cadastro e gestão de fornecedores</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">💰 Vendas</h3>
              <p className="text-gray-600 text-sm">Sistema de vendas e faturamento</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            🚀 Sistema pronto para desenvolvimento das funcionalidades
          </p>
          <div className="mt-4 space-x-4">
            <a 
                              href="http://localhost:3001" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              🔧 API Backend
            </a>
            <a 
              href="http://localhost:8080" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
            >
              📊 PgAdmin
            </a>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white text-center py-4 mt-8">
        <p>&copy; 2024 Sistema de Farmácia - Desenvolvido com ❤️</p>
      </footer>
    </div>
  );
}

export default App;