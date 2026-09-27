const express = require("express");
const cors = require("cors");
const path = require("path");


require("dotenv").config();

const authRoutes =
require("./routes/auth.routes");
const authMiddleware = 
require("./middleware/auth.middleware");
const quizRoutes =
require("./routes/quiz.routes");
const questionRoutes =
    require("./routes/question.routes");
const categoryRoutes =
    require("./routes/category.routes");
const fileRoutes =
    require("./routes/file.routes");

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
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

app.get(
    "/api/profile",
    authMiddleware,
    (req,res)=>{

        res.json({

            message:"Доступ разрешен",

            user:req.user

        });

    }
);

// Тестовый маршрут

app.get("/", (req, res) => {

    res.json({
        message: "WebQuiz backend работает"
    });

});



module.exports = app;