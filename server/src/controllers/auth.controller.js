const authService = require("../services/auth.service");

// регистрация

async function register(req,res){
    try{
        const {
            username,
            email,
            password,
            role
        } = req.body;

        const user =
            await authService.register(
                username,
                email,
                password,
                role
            );

        res.status(201).json({
            message:
            "Пользователь создан",

            user
        });
    }
    catch(error){
        res.status(400).json({
            message:error.message
        });
    }
}

// вход

async function login(req,res){
    try{
        const {
            email,
            password
        } = req.body;

        const data =
            await authService.login(
                email,
                password
            );

        res.json(data);
    }
    catch(error){

        res.status(400).json({
            message:error.message
        });
    }
}

module.exports={
    register,
    login
};