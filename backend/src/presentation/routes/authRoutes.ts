import { Router } from 'express';
import { AuthController } from '@/presentation/controllers/AuthController';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';

const router = Router();
const authController = new AuthController();

// Rotas públicas
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));
router.post('/logout', authController.logout.bind(authController));

// Rotas protegidas
router.use(authMiddleware);
router.get('/me', authController.me.bind(authController));
router.put('/alterar-senha', authController.alterarSenha.bind(authController));

export default router;
