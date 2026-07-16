const quizService =
require("../services/quiz.service");



async function createQuiz(req,res){

    try{


        const {
            title,
            description,
            categoryId,
            questionTime
        } = req.body;



        const organizerId =
            req.user.id;



        const quiz =
            await quizService.createQuiz(
                organizerId,
                title,
                description,
                categoryId,
                questionTime
            );



        res.status(201).json({

            message:
            "Квиз создан",

            quiz

        });



    }
    catch(error){


        res.status(400).json({

            message:error.message

        });


    }

}



module.exports = {
    createQuiz
};