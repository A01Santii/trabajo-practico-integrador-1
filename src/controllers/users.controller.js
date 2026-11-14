import { body, param } from 'express-validator';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User, Profile, Article } from '../models/index.js';
import { hashPassword } from '../helpers/bcrypt.js';
import { runValidations } from '../helpers/validate.js';
import { profileRules } from './auth.controller.js';

const idValidation = [
    param('id').isInt({ min: 1 }).withMessage('El id debe ser un número entero positivo'),
];

const userRules = (required) => {
    const field = (name) => (required ? body(name) : body(name).optional());

    return [
        field('username')
            .trim()
            .notEmpty()
            .withMessage('El username es obligatorio')
            .bail()
            .isLength({ min: 3, max: 20 })
            .withMessage('El username debe tener entre 3 y 20 caracteres')
            .bail()
            .isAlphanumeric()
            .withMessage('El username solo puede tener letras y números')
            .bail()
            .custom(async (value, { req }) => {
                const where = { username: value };
                if (req.params.id) where.id = { [Op.ne]: req.params.id };
                const existing = await User.findOne({ where, paranoid: false });
                if (existing) throw new Error('El username ya está en uso');
            }),
        field('email')
            .trim()
            .notEmpty()
            .withMessage('El email es obligatorio')
            .bail()
            .isEmail()
            .withMessage('El email no tiene un formato válido')
            .bail()
            .custom(async (value, { req }) => {
                const where = { email: value };
                if (req.params.id) where.id = { [Op.ne]: req.params.id };
                const existing = await User.findOne({ where, paranoid: false });
                if (existing) throw new Error('El email ya está registrado');
            }),
        field('password')
            .notEmpty()
            .withMessage('La contraseña es obligatoria')
            .bail()
            .isLength({ min: 8 })
            .withMessage('La contraseña debe tener al menos 8 caracteres')
            .bail()
            .matches(/[A-Z]/)
            .withMessage('La contraseña debe tener al menos una mayúscula')
            .bail()
            .matches(/[a-z]/)
            .withMessage('La contraseña debe tener al menos una minúscula')
            .bail()
            .matches(/\d/)
            .withMessage('La contraseña debe tener al menos un número'),
        body('role').optional().isIn(['user', 'admin']).withMessage("El rol debe ser 'user' o 'admin'"),
    ];
};

const profileFields = ['first_name', 'last_name', 'biography', 'avatar_url', 'birth_date'];


export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            include: [{ model: Profile, as: 'profile' }],
        });

        return res.status(200).json({ ok: true, total: users.length, data: users });
    } catch (error) {
        console.error('Error en getUsers:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const getUserById = async (req, res) => {
    try {
        const errors = await runValidations(req, idValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] },
            include: [
                { model: Profile, as: 'profile' },
                { model: Article, as: 'articles' },
            ],
        });

        if (!user) {
            return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
        }

        return res.status(200).json({ ok: true, data: user });
    } catch (error) {
        console.error('Error en getUserById:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const createUser = async (req, res) => {
    try {
        const errors = await runValidations(req, [...userRules(true), ...profileRules(true)]);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const { username, email, password, role } = req.body;
        const profileData = {};
        profileFields.forEach((f) => {
            if (req.body[f] !== undefined) profileData[f] = req.body[f];
        });

        const { user, profile } = await sequelize.transaction(async (t) => {
            const user = await User.create(
                { username, email, password: await hashPassword(password), role },
                { transaction: t }
            );
            const profile = await Profile.create(
                { ...profileData, user_id: user.id },
                { transaction: t }
            );
            return { user, profile };
        });

        const { password: _hidden, ...userData } = user.toJSON();

        return res.status(201).json({
            ok: true,
            message: 'Usuario creado correctamente',
            data: { ...userData, profile },
        });
    } catch (error) {
        console.error('Error en createUser:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const errors = await runValidations(req, [
            ...idValidation,
            ...userRules(false),
            ...profileRules(false),
        ]);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
        }

        const userData = {};
        ['username', 'email', 'role'].forEach((f) => {
            if (req.body[f] !== undefined) userData[f] = req.body[f];
        });
        if (req.body.password) userData.password = await hashPassword(req.body.password);

        const profileData = {};
        profileFields.forEach((f) => {
            if (req.body[f] !== undefined) profileData[f] = req.body[f];
        });

        await sequelize.transaction(async (t) => {
            if (Object.keys(userData).length) await user.update(userData, { transaction: t });
            if (Object.keys(profileData).length) {
                await Profile.update(profileData, { where: { user_id: user.id }, transaction: t });
            }
        });

        const updated = await User.findByPk(user.id, {
            attributes: { exclude: ['password'] },
            include: [{ model: Profile, as: 'profile' }],
        });

        return res.status(200).json({
            ok: true,
            message: 'Usuario actualizado correctamente',
            data: updated,
        });
    } catch (error) {
        console.error('Error en updateUser:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const errors = await runValidations(req, idValidation);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
        }

        if (user.id === req.user.id) {
            return res.status(400).json({
                ok: false,
                message: 'No podés eliminar tu propia cuenta',
            });
        }

        await user.destroy(); 

        return res.status(200).json({ ok: true, message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error en deleteUser:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};