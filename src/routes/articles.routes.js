import { Router } from 'express';
import {
    createArticle,
    getArticles,
    getArticleById,
    getMyArticles,
    getMyArticleById,
    updateArticle,
    deleteArticle,
} from '../controllers/articles.controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { ownerMiddleware } from '../middlewares/ownerMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/user', getMyArticles);
router.get('/user/:id', getMyArticleById);

router.post('/', createArticle);
router.get('/', getArticles);
router.get('/:id', getArticleById);
router.put('/:id', ownerMiddleware(true), updateArticle); 
router.delete('/:id', ownerMiddleware(true), deleteArticle); 

export default router;