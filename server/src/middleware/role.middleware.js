function roleMiddleware(requiredRole) {
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Требуется авторизация"
            });
        }

        if (req.user.role !== requiredRole) {
            return res.status(403).json({
                message: "Недостаточно прав"
            });
        }

        next();
    };
}

module.exports = roleMiddleware;