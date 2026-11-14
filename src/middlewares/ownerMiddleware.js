import { Article, ArticleTag } from '../models/index.js';

const isValidId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

export const ownerMiddleware = (allowAdmin = false) => {
    return async (req, res, next) => {
        try {
            let articleId = null;

            if (req.params.articleTagId !== undefined) {
                if (!isValidId(req.params.articleTagId)) {
                    return res.status(400).json({
                        ok: false,
                        message: 'El articleTagId debe ser un número entero positivo',
                    });
                }
                const articleTag = await ArticleTag.findByPk(req.params.articleTagId);
                if (!articleTag) {
                    return res.status(404).json({
                        ok: false,
                        message: 'La asociación artículo-etiqueta no existe',
                    });
                }
                articleId = articleTag.article_id;
            } else if (req.params.id !== undefined) {
                articleId = req.params.id;
            } else if (req.body?.article_id !== undefined) {
                articleId = req.body.article_id;
            }

            if (articleId === null) {
                return res.status(400).json({ ok: false, message: 'No se indicó el artículo' });
            }

            if (!isValidId(articleId)) {
                return res.status(400).json({
                    ok: false,
                    message: 'El id del artículo debe ser un número entero positivo',
                });
            }

            const article = await Article.findByPk(articleId);
            if (!article) {
                return res.status(404).json({ ok: false, message: 'El artículo no existe' });
            }

            const isAdmin = req.user.role === 'admin';
            const isOwner = article.user_id === req.user.id;

            if (!isOwner && !(allowAdmin && isAdmin)) {
                return res.status(403).json({
                    ok: false,
                    message: 'No tenés permiso sobre este artículo',
                });
            }

            req.article = article; 
            next();
        } catch (error) {
            console.error('Error en ownerMiddleware:', error);
            return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
        }
    };
};