const profileService =
    require("../services/profile.service");

async function getProfile(req, res) {
    try {
        const user =
            await profileService.getProfile(
                req.user.id
            );

        if (!user) {
            return res.status(404).json({
                message: "Пользователь не найден"
            });
        }

        res.json({
            user
        });
    } catch (error) {
        console.error(
            "Ошибка получения профиля:",
            error
        );

        res.status(500).json({
            message: "Ошибка получения профиля"
        });
    }
}

async function updateProfile(req, res) {
    try {
        const {
            username,
            email
        } = req.body;

        if (!username || !email) {
            return res.status(400).json({
                message: "Username и email обязательны"
            });
        }

        const user =
            await profileService.updateProfile(
                req.user.id,
                username,
                email
            );

        if (!user) {
            return res.status(404).json({
                message: "Пользователь не найден"
            });
        }

        res.json({
            message: "Профиль обновлен",
            user
        });
    } catch (error) {
        console.error(
            "Ошибка обновления профиля:",
            error
        );

        if (error.code === "23505") {
            return res.status(409).json({
                message:
                    "Username или email уже используется"
            });
        }

        res.status(500).json({
            message: "Ошибка обновления профиля"
        });
    }
}

async function changePassword(req, res) {
    try {
        const {
            currentPassword,
            newPassword
        } = req.body;

        if (
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                message:
                    "Текущий и новый пароль обязательны"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message:
                    "Новый пароль должен содержать минимум 6 символов"
            });
        }

        await profileService.changePassword(
            req.user.id,
            currentPassword,
            newPassword
        );

        res.json({
            message: "Пароль успешно изменен"
        });
    } catch (error) {
        console.error(
            "Ошибка смены пароля:",
            error
        );

        if (
            error.message ===
            "Неверный текущий пароль"
        ) {
            return res.status(400).json({
                message:
                    "Неверный текущий пароль"
            });
        }

        res.status(500).json({
            message:
                "Ошибка смены пароля"
        });
    }
}

module.exports = {
    getProfile,
    updateProfile,
    changePassword
};