import { verifyToken } from '../helpers/jwt.js';
import { User } from '../models/index.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                ok: false,
                message: 'No autenticado: iniciá sesión para continuar',
            });
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (error) {
            return res.status(401).json({
                ok: false,
                message: 'Token inválido o expirado',
            });
        }

        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'email', 'role'],
        });

        if (!user) {
            return res.status(401).json({
                ok: false,
                message: 'El usuario del token ya no existe',
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error en authMiddleware:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};