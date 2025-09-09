import React, { useState } from 'react';
import Layout from '../components/Layout';
import IconTest from '../components/IconTest';

const IconTestPage: React.FC = () => {
  const [clickCount, setClickCount] = useState(0);

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    console.log('Ícone clicado!');
  };

  return (
    <Layout>
      <div className="p-6">

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="mb-4">Número de cliques: <span className="font-bold">{clickCount}</span></p>
          <IconTest onClick={handleClick} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Informações de Depuração</h2>
          <div className="space-y-2">
            <p><strong>React Version:</strong> {React.version}</p>
            <p><strong>User Agent:</strong> {navigator.userAgent}</p>
            <p><strong>Viewport:</strong> {window.innerWidth} x {window.innerHeight}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default IconTestPage;