import { body, param } from 'express-validator';
import { Tag, ArticleTag } from '../models/index.js';
import { Article } from '../models/index.js';
import { runValidations } from '../helpers/validate.js';

const addTagValidations = [
    body('article_id')
        .isInt({ min: 1 })
        .withMessage('article_id debe ser un número entero positivo')
        .bail()
        .custom(async (value) => {
            const article = await Article.findByPk(value);
            if (!article) throw new Error('El artículo no existe');
        }),
    body('tag_id')
        .isInt({ min: 1 })
        .withMessage('tag_id debe ser un número entero positivo')
        .bail()
        .custom(async (value, { req }) => {
            const tag = await Tag.findByPk(value);
            if (!tag) throw new Error('La etiqueta no existe');

            const alreadyLinked = await ArticleTag.findOne({
                where: { article_id: req.body.article_id, tag_id: value },
            });
            if (alreadyLinked) throw new Error('El artículo ya tiene esa etiqueta');
        }),
];

const removeValidations = [
    param('articleTagId')
        .isInt({ min: 1 })
        .withMessage('El articleTagId debe ser un número entero positivo'),
];

export const addTagToArticle = async (req, res) => {
    try {
        const errors = await runValidations(req, addTagValidations);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const { article_id, tag_id } = req.body;

        const articleTag = await ArticleTag.create({ article_id, tag_id });

        const result = await ArticleTag.findByPk(articleTag.id, {
            include: [{ model: Tag, as: 'tag', attributes: ['id', 'name'] }],
        });

        return res.status(201).json({
            ok: true,
            message: 'Etiqueta agregada al artículo correctamente',
            data: result,
        });
    } catch (error) {
        console.error('Error en addTagToArticle:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const removeTagFromArticle = async (req, res) => {
    try {
        const errors = await runValidations(req, removeValidations);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const articleTag = await ArticleTag.findByPk(req.params.articleTagId);
        if (!articleTag) {
            return res.status(404).json({
                ok: false,
                message: 'La asociación artículo-etiqueta no existe',
            });
        }

        await articleTag.destroy();

        return res.status(200).json({
            ok: true,
            message: 'Etiqueta removida del artículo correctamente',
        });
    } catch (error) {
        console.error('Error en removeTagFromArticle:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};