const http = require("http");

const app = require("./app");
const pool = require("./config/database");
const setupQuizSocket = require("./websocket/quiz.socket");

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await pool.query("SELECT 1");

        console.log("База данных доступна");

        const server = http.createServer(app);

        setupQuizSocket(server);

        server.listen(PORT, () => {
            console.log(
                `Сервер запущен на порту ${PORT}`
            );

            console.log(
                `WebSocket: ws://localhost:${PORT}/ws`
            );
        });
    } catch (error) {
        console.error(
            "Ошибка запуска:",
            error.message
        );

        process.exit(1);
    }
}

startServer();