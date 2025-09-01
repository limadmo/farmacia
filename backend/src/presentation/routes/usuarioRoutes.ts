import { Router } from 'express';
import { UsuarioController } from '@/presentation/controllers/UsuarioController';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';
import { requireModulePermission } from '@/presentation/middleware/authorizationMiddleware';

const router = Router();
const usuarioController = new UsuarioController();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Rotas que permitem acesso a usuários gerenciáveis (sem necessidade de permissão do módulo)
router.get('/tipos-gerenciaveis', usuarioController.getTiposGerenciaveis.bind(usuarioController));
router.get('/gerenciaveis', usuarioController.listarGerenciaveis.bind(usuarioController));

// Rotas que requerem permissão do módulo usuarios (ADMINISTRADOR e GERENTE)
router.use(requireModulePermission('usuarios'));
router.get('/', usuarioController.listar.bind(usuarioController));
router.get('/perfis', usuarioController.listarPerfis.bind(usuarioController));
router.put('/:id/senha', usuarioController.alterarSenha.bind(usuarioController));
router.get('/:id', usuarioController.obterPorId.bind(usuarioController));
router.post('/', usuarioController.criar.bind(usuarioController));
router.put('/:id', usuarioController.atualizar.bind(usuarioController));
router.delete('/:id', usuarioController.excluir.bind(usuarioController));

export default router;
