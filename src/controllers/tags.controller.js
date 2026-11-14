import { body, param } from 'express-validator';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Tag, Article, ArticleTag } from '../models/index.js';
import { runValidations } from '../helpers/validate.js';

const idValidation = [
    param('id').isInt({ min: 1 }).withMessage('El id debe ser un número entero positivo'),
];

const nameValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre es obligatorio')
        .bail()
        .isLength({ min: 2, max: 30 })
        .withMessage('El nombre debe tener entre 2 y 30 caracteres')
        .bail()
        .matches(/^\S+$/)
        .withMessage('El nombre no puede contener espacios')
        .bail()
        .custom(async (value, { req }) => {
            const where = { name: value };
            // al editar, ignoramos la propia etiqueta
            if (req.params.id) where.id = { [Op.ne]: req.params.id };
            const existing = await Tag.findOne({ where });
            if (existing) throw new Error('Ya existe una etiqueta con ese nombre');
        }),
];


export const createTag = async (req, res) => {
    try {
        const errors = await runValidations(req, nameValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const tag = await Tag.create({ name: req.body.name });

        return res.status(201).json({
            ok: true,
            message: 'Etiqueta creada correctamente',
            data: tag,
        });
    } catch (error) {
        console.error('Error en createTag:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const getTags = async (req, res) => {
    try {
        const tags = await Tag.findAll({ order: [['name', 'ASC']] });

        return res.status(200).json({ ok: true, total: tags.length, data: tags });
    } catch (error) {
        console.error('Error en getTags:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};


export const getTagById = async (req, res) => {
    try {
        const errors = await runValidations(req, idValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const tag = await Tag.findByPk(req.params.id, {
            include: [
                {
                    model: Article,
                    as: 'articles',
                    through: { attributes: [] }, 
                },
            ],
        });

        if (!tag) {
            return res.status(404).json({ ok: false, message: 'Etiqueta no encontrada' });
        }

        return res.status(200).json({ ok: true, data: tag });
    } catch (error) {
        console.error('Error en getTagById:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};


export const updateTag = async (req, res) => {
    try {
        const errors = await runValidations(req, [...idValidation, ...nameValidation]);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const tag = await Tag.findByPk(req.params.id);
        if (!tag) {
            return res.status(404).json({ ok: false, message: 'Etiqueta no encontrada' });
        }

        await tag.update({ name: req.body.name });

        return res.status(200).json({
            ok: true,
            message: 'Etiqueta actualizada correctamente',
            data: tag,
        });
    } catch (error) {
        console.error('Error en updateTag:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};


export const deleteTag = async (req, res) => {
    try {
        const errors = await runValidations(req, idValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const tag = await Tag.findByPk(req.params.id);
        if (!tag) {
            return res.status(404).json({ ok: false, message: 'Etiqueta no encontrada' });
        }

        await sequelize.transaction(async (t) => {
            await ArticleTag.destroy({ where: { tag_id: tag.id }, transaction: t });
            await tag.destroy({ transaction: t });
        });

        return res.status(200).json({ ok: true, message: 'Etiqueta eliminada correctamente' });
    } catch (error) {
        console.error('Error en deleteTag:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};