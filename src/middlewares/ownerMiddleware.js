import { Article, ArticleTag } from '../models/index.js';

export const ownerMiddleware = (allowAdmin = false) => {
    return async (req, res, next) => {
        try {
            let articleId = null;

            if (req.params.articleTagId) {
                const articleTag = await ArticleTag.findByPk(req.params.articleTagId);
                if (!articleTag) {
                    return res.status(404).json({
                        ok: false,
                        message: 'La asociación artículo-etiqueta no existe',
                    });
                }
                articleId = articleTag.article_id;
            } else if (req.params.id) {
                articleId = req.params.id;
            } else if (req.body.article_id) {
                articleId = req.body.article_id;
            }

            if (!articleId) {
                return res.status(400).json({
                    ok: false,
                    message: 'No se indicó el artículo',
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