import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface IconTestProps {
  onClick?: () => void;
}

const IconTest: React.FC<IconTestProps> = ({ onClick }) => {
  return (
    <div className="p-4 border rounded shadow-sm m-4">
      <h2 className="text-lg font-semibold mb-4">Teste de Ícones SVG</h2>
      
      <div className="flex flex-col space-y-4">
        <div>
          <h3 className="text-md font-medium mb-2">Ícone Padrão</h3>
          <button 
            className="text-red-600 hover:text-red-900 transition p-2 border rounded"
            onClick={onClick}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Ícone com aria-hidden</h3>
          <button 
            className="text-red-600 hover:text-red-900 transition p-2 border rounded"
            onClick={onClick}
          >
            <TrashIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Ícone com role="img"</h3>
          <button 
            className="text-red-600 hover:text-red-900 transition p-2 border rounded"
            onClick={onClick}
          >
            <TrashIcon className="h-5 w-5" role="img" />
          </button>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Ícone com focusable="false"</h3>
          <button 
            className="text-red-600 hover:text-red-900 transition p-2 border rounded"
            onClick={onClick}
          >
            <TrashIcon className="h-5 w-5" focusable="false" />
          </button>
        </div>

        <div>
          <h3 className="text-md font-medium mb-2">Ícone com todas as correções</h3>
          <button 
            className="text-red-600 hover:text-red-900 transition p-2 border rounded"
            onClick={onClick}
            aria-label="Remover item"
          >
            <TrashIcon 
              className="h-5 w-5" 
              aria-hidden="true" 
              focusable="false" 
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IconTest;