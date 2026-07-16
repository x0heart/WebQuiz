const app = require("./app");
const pool = require("./config/database");


const PORT = process.env.PORT || 5000;



async function startServer(){

    try{

        await pool.query(
            "SELECT 1"
        );


        console.log(
            "База данных доступна"
        );


        app.listen(PORT, ()=>{

            console.log(
                `Сервер запущен на порту ${PORT}`
            );

        });


    }
    catch(error){

        console.error(
            "Ошибка запуска:",
            error.message
        );

        process.exit(1);

    }

}



startServer();