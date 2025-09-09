import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  loading = false
}) => {
  const [inputPage, setInputPage] = useState('');

  /**
   * Gera array de páginas seguindo padrão: 1, 2, 3, [INPUT], 8, 9, 10
   * Para 6 páginas ou menos: mostra todas
   * Para mais de 6 páginas: 3 primeiras + input + 3 últimas
   */
  const getSmartPages = (): (number | 'input')[] => {
    // Se tem 6 páginas ou menos, mostrar todas
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Padrão: 1, 2, 3, INPUT, n-2, n-1, n
    const pages: (number | 'input')[] = [
      1, 
      2, 
      3, 
      'input', 
      totalPages - 2, 
      totalPages - 1, 
      totalPages
    ];
    return pages;
  };

  /**
   * Submete navegação via input
   */
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
    setInputPage('');
  };

  /**
   * Gerencia teclas no input
   */
  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInputPage('');
    }
  };

  // Não mostrar paginação se só tem 1 página
  if (totalPages <= 1) return null;

  const smartPages = getSmartPages();

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      {/* Mobile - versão simplificada */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
          {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próxima
        </button>
      </div>

      {/* Desktop - paginação completa */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
            <span className="font-medium">{totalPages}</span>
            {' '}({totalItems} itens total)
          </p>
        </div>
        
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginação">
            {/* Botão Anterior */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            {/* Páginas inteligentes */}
            {smartPages.map((item, index) => {
              if (item === 'input') {
                return (
                  <div key="input" className="relative inline-flex">
                    <form onSubmit={handleInputSubmit} className="relative">
                      <input
                        type="number"
                        value={inputPage}
                        onChange={(e) => setInputPage(e.target.value)}
                        onKeyDown={handleInputKeyPress}
                        placeholder={`1-${totalPages}`}
                        min="1"
                        max={totalPages}
                        disabled={loading}
                        className="w-16 px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                        title="Digite o número da página"
                      />
                    </form>
                  </div>
                );
              }

              const pageNum = item as number;
              const isCurrentPage = currentPage === pageNum;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors duration-150 ${
                    isCurrentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={`Ir para página ${pageNum}`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Botão Próxima */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;