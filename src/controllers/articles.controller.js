import { body, param } from 'express-validator';
import { sequelize } from '../config/database.js';
import { User, Article, Tag, ArticleTag } from '../models/index.js';
import { runValidations } from '../helpers/validate.js';

const articleIncludes = [
    { model: User, as: 'author', attributes: ['id', 'username'] },
    {
        model: Tag,
        as: 'tags',
        attributes: ['id', 'name'],
        through: { attributes: ['id'] },
    },
];


const idValidation = [
    param('id').isInt({ min: 1 }).withMessage('El id debe ser un número entero positivo'),
];

const articleRules = (required) => {
    const field = (name) => (required ? body(name) : body(name).optional());

    return [
        field('title')
            .trim()
            .notEmpty()
            .withMessage('El título es obligatorio')
            .bail()
            .isLength({ min: 3, max: 200 })
            .withMessage('El título debe tener entre 3 y 200 caracteres'),
        field('content')
            .trim()
            .notEmpty()
            .withMessage('El contenido es obligatorio')
            .bail()
            .isLength({ min: 50 })
            .withMessage('El contenido debe tener al menos 50 caracteres'),
        body('excerpt')
            .optional({ values: 'null' })
            .isLength({ max: 500 })
            .withMessage('El resumen no puede superar los 500 caracteres'),
        body('status')
            .optional()
            .isIn(['published', 'archived'])
            .withMessage("El estado debe ser 'published' o 'archived'"),
    ];
};

const userIdRule = body('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El user_id debe ser un número entero positivo')
    .bail()
    .custom(async (value, { req }) => {
        const user = await User.findByPk(value);
        if (!user) throw new Error('El usuario indicado no existe');

        if (req.user.role !== 'admin' && Number(value) !== req.user.id) {
            throw new Error('No podés crear artículos a nombre de otro usuario');
        }
    });

const articleFields = ['title', 'content', 'excerpt', 'status'];

const pickFields = (body) => {
    const data = {};
    articleFields.forEach((f) => {
        if (body?.[f] !== undefined) data[f] = body[f];
    });
    return data;
};


export const createArticle = async (req, res) => {
    try {
        const errors = await runValidations(req, [...articleRules(true), userIdRule]);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const article = await Article.create({
            ...pickFields(req.body),
            user_id: req.body.user_id ?? req.user.id, 
        });

        const created = await Article.findByPk(article.id, { include: articleIncludes });

        return res.status(201).json({
            ok: true,
            message: 'Artículo creado correctamente',
            data: created,
        });
    } catch (error) {
        console.error('Error en createArticle:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const getArticles = async (req, res) => {
    try {
        const articles = await Article.findAll({
            where: { status: 'published' },
            include: articleIncludes,
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ ok: true, total: articles.length, data: articles });
    } catch (error) {
        console.error('Error en getArticles:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};


export const getArticleById = async (req, res) => {
    try {
        const errors = await runValidations(req, idValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const article = await Article.findByPk(req.params.id, { include: articleIncludes });

        const canSeeArchived =
            article && (article.user_id === req.user.id || req.user.role === 'admin');

        if (!article || (article.status === 'archived' && !canSeeArchived)) {
            return res.status(404).json({ ok: false, message: 'Artículo no encontrado' });
        }

        return res.status(200).json({ ok: true, data: article });
    } catch (error) {
        console.error('Error en getArticleById:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const getMyArticles = async (req, res) => {
    try {
        const articles = await Article.findAll({
            where: { user_id: req.user.id, status: 'published' },
            include: articleIncludes,
            order: [['createdAt', 'DESC']],
        });

        return res.status(200).json({ ok: true, total: articles.length, data: articles });
    } catch (error) {
        console.error('Error en getMyArticles:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const getMyArticleById = async (req, res) => {
    try {
        const errors = await runValidations(req, idValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const article = await Article.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            include: articleIncludes,
        });

        if (!article) {
            return res.status(404).json({
                ok: false,
                message: 'Artículo no encontrado entre tus artículos',
            });
        }

        return res.status(200).json({ ok: true, data: article });
    } catch (error) {
        console.error('Error en getMyArticleById:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const updateArticle = async (req, res) => {
    try {
        const errors = await runValidations(req, [...idValidation, ...articleRules(false)]);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        await req.article.update(pickFields(req.body));

        const updated = await Article.findByPk(req.article.id, { include: articleIncludes });

        return res.status(200).json({
            ok: true,
            message: 'Artículo actualizado correctamente',
            data: updated,
        });
    } catch (error) {
        console.error('Error en updateArticle:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};


export const deleteArticle = async (req, res) => {
    try {
        const errors = await runValidations(req, idValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        await sequelize.transaction(async (t) => {
            await ArticleTag.destroy({ where: { article_id: req.article.id }, transaction: t });
            await req.article.destroy({ transaction: t });
        });

        return res.status(200).json({ ok: true, message: 'Artículo eliminado correctamente' });
    } catch (error) {
        console.error('Error en deleteArticle:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};