import { Router } from 'express';
import {
    createTag,
    getTags,
    getTagById,
    updateTag,
    deleteTag,
} from '../controllers/tags.controller.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, createTag); 
router.get('/', authMiddleware, getTags); 
router.get('/:id', authMiddleware, adminMiddleware, getTagById); 
router.put('/:id', authMiddleware, adminMiddleware, updateTag); 
router.delete('/:id', authMiddleware, adminMiddleware, deleteTag); 

export default router;