const historyService =
    require("../services/history.service");

async function getHistory(req, res) {
    try {
        if (req.user.role === "organizer") {
            const history =
                await historyService.getOrganizerHistory(
                    req.user.id
                );

            return res.json({
                role: "organizer",
                history
            });
        }

        if (req.user.role === "participant") {
            const history =
                await historyService.getParticipantHistory(
                    req.user.id
                );

            return res.json({
                role: "participant",
                history
            });
        }

        return res.status(403).json({
            message: "Неизвестная роль пользователя"
        });
    } catch (error) {
        console.error(
            "Ошибка получения истории:",
            error
        );

        res.status(500).json({
            message: "Ошибка получения истории"
        });
    }
}

module.exports = {
    getHistory
};