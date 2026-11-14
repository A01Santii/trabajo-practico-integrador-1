import { body } from 'express-validator';
import { sequelize } from '../config/database.js';
import { User, Profile } from '../models/index.js';
import { hashPassword, comparePassword } from '../helpers/bcrypt.js';
import { generateToken } from '../helpers/jwt.js';
import { runValidations } from '../helpers/validate.js';


const cookieOptions = {
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, 
};


const lettersRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/;

const nameRule = (field, label, required) => {
    const chain = body(field);
    if (!required) chain.optional();
    return chain
        .trim()
        .notEmpty()
        .withMessage(`${label} es obligatorio`)
        .bail()
        .isLength({ min: 2, max: 50 })
        .withMessage(`${label} debe tener entre 2 y 50 caracteres`)
        .bail()
        .matches(lettersRegex)
        .withMessage(`${label} solo puede contener letras`);
};

const profileRules = (required) => [
    nameRule('first_name', 'El nombre', required),
    nameRule('last_name', 'El apellido', required),
    body('biography')
        .optional()
        .isLength({ max: 500 })
        .withMessage('La biografía no puede superar los 500 caracteres'),
    body('avatar_url').optional().isURL().withMessage('avatar_url debe ser una URL válida'),
    body('birth_date')
        .optional()
        .isISO8601()
        .withMessage('birth_date debe tener formato AAAA-MM-DD'),
];

const registerValidations = [
    body('username')
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
        .custom(async (value) => {
            const existing = await User.findOne({ where: { username: value }, paranoid: false });
            if (existing) throw new Error('El username ya está en uso');
        }),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('El email es obligatorio')
        .bail()
        .isEmail()
        .withMessage('El email no tiene un formato válido')
        .bail()
        .custom(async (value) => {
            const existing = await User.findOne({ where: { email: value }, paranoid: false });
            if (existing) throw new Error('El email ya está registrado');
        }),
    body('password')
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
    ...profileRules(true),
];

const loginValidations = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('El email es obligatorio')
        .bail()
        .isEmail()
        .withMessage('El email no tiene un formato válido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
];

const updateProfileValidations = profileRules(false);


export const register = async (req, res) => {
    try {
        const errors = await runValidations(req, registerValidations);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const { username, email, password, first_name, last_name, biography, avatar_url, birth_date } =
            req.body;

        const { user, profile } = await sequelize.transaction(async (t) => {
            const user = await User.create(
                { username, email, password: await hashPassword(password) },
                { transaction: t }
            );
            const profile = await Profile.create(
                { user_id: user.id, first_name, last_name, biography, avatar_url, birth_date },
                { transaction: t }
            );
            return { user, profile };
        });

        return res.status(201).json({
            ok: true,
            message: 'Usuario registrado correctamente',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile,
            },
        });
    } catch (error) {
        console.error('Error en register:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const login = async (req, res) => {
    try {
        const errors = await runValidations(req, loginValidations);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        const passwordOk = user ? await comparePassword(password, user.password) : false;

        if (!user || !passwordOk) {
            return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
        }

        const token = generateToken({ id: user.id, role: user.role });
        res.cookie('token', token, cookieOptions);

        return res.status(200).json({
            ok: true,
            message: 'Login exitoso',
            data: { id: user.id, username: user.username, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{ model: Profile, as: 'profile' }],
        });

        return res.status(200).json({ ok: true, data: user });
    } catch (error) {
        console.error('Error en getProfile:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const errors = await runValidations(req, updateProfileValidations);
        if (errors) {
            return res.status(400).json({ ok: false, message: 'Errores de validación', errors });
        }

        const profile = await Profile.findOne({ where: { user_id: req.user.id } });
        if (!profile) {
            return res.status(404).json({ ok: false, message: 'Perfil no encontrado' });
        }

        const allowedFields = ['first_name', 'last_name', 'biography', 'avatar_url', 'birth_date'];
        const data = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) data[field] = req.body[field];
        });

        await profile.update(data);

        return res.status(200).json({
            ok: true,
            message: 'Perfil actualizado correctamente',
            data: profile,
        });
    } catch (error) {
        console.error('Error en updateProfile:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};

export const logout = async (req, res) => {
    try {
        const { maxAge, ...clearOptions } = cookieOptions;
        res.clearCookie('token', clearOptions);

        return res.status(200).json({ ok: true, message: 'Sesión cerrada correctamente' });
    } catch (error) {
        console.error('Error en logout:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};