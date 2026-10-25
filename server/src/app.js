const express = require("express");
const cors = require("cors");
const path = require("path");


require("dotenv").config();

const authRoutes =
    require("./routes/auth.routes");
const quizRoutes =
    require("./routes/quiz.routes");
const questionRoutes =
    require("./routes/question.routes");
const categoryRoutes =
    require("./routes/category.routes");
const fileRoutes =
    require("./routes/file.routes");
const profileRoutes =
    require("./routes/profile.routes");
const historyRoutes =
    require("./routes/history.routes");
const sessionRoutes =
    require("./routes/session.routes");

const app = express();


// Middleware

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/quizzes",
    quizRoutes
);

app.use(
    "/api", 
    questionRoutes
);

app.use(
    "/api/categories",
    categoryRoutes
);

app.use(
    "/api/files",
    fileRoutes
);

app.use(
    "/api/profile",
    profileRoutes
);

app.use(
    "/api/history",
    historyRoutes
);

app.use(
    "/api",
    sessionRoutes
);

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);



// Тестовый маршрут

app.get("/", (req, res) => {

    res.json({
        message: "WebQuiz backend работает"
    });

});



module.exports = app;