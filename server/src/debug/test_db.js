const pool = require("../config/database");


async function testDatabase(){

    try{

        const result = await pool.query(
            "SELECT current_database();"
        );


        console.log(
            "Подключена база:",
            result.rows[0].current_database
        );


    }
    catch(error){

        console.error(
            "Ошибка подключения:",
            error.message
        );

    }
    finally{

        pool.end();

    }

}


testDatabase();