import { Router } from 'express';
import {
    addTagToArticle,
    removeTagFromArticle,
} from '../controllers/articleTags.controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { ownerMiddleware } from '../middlewares/ownerMiddleware.js';

const router = Router();

router.post('/', authMiddleware, ownerMiddleware(false), addTagToArticle);
router.delete('/:articleTagId', authMiddleware, ownerMiddleware(false), removeTagFromArticle);

export default router;