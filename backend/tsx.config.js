// Configuração para TSX resolver path aliases
const { resolve } = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  typescript: {
    compilerOptions: {
      baseUrl: 'src',
      paths: {
        '@/*': ['*'],
        '@/domain/*': ['domain/*'],
        '@/application/*': ['application/*'],
        '@/infrastructure/*': ['infrastructure/*'],
        '@/presentation/*': ['presentation/*'],
        '@/shared/*': ['shared/*']
      }
    }
  }
};
