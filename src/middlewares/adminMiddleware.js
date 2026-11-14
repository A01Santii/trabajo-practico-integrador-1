export const adminMiddleware = (req, res, next) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                ok: false,
                message: 'Acceso denegado: se requieren permisos de administrador',
            });
        }
        next();
    } catch (error) {
        console.error('Error en adminMiddleware:', error);
        return res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
};