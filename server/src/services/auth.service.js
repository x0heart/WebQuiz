const pool = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function register(
    username,
    email,
    password,
    role
){
    const existingUser = await pool.query(
        `
        SELECT id 
        FROM users 
        WHERE email=$1 OR username=$2
        `,
        [
            email,
            username
        ]
    );

    if(existingUser.rows.length > 0){
        throw new Error(
            "Пользователь уже существует"
        );
    }

    const passwordHash = await bcrypt.hash(
        password,
        10
    );

    const result = await pool.query(
        `
        INSERT INTO users
        (
            username,
            email,
            password_hash,
            role
        )
        VALUES
        ($1,$2,$3,$4)
        RETURNING id, username, email, role
        `,
        [
            username,
            email,
            passwordHash,
            role
        ]
    );

    return result.rows[0];
}

async function login(
    email,
    password
){
    const result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE email=$1
        `,
        [
            email
        ]
    );

    if(result.rows.length === 0){
        throw new Error(
            "Пользователь не найден"
        );
    }

    const user = result.rows[0];

    const validPassword =
        await bcrypt.compare(
            password,
            user.password_hash
        );

    if(!validPassword){
        throw new Error(
            "Неверный пароль"
        );
    }

    const token = jwt.sign(
        {
            id:user.id,
            role:user.role
        },

        process.env.JWT_SECRET,
        {
            expiresIn:"24h"
        }
    );

    return {
        token,
        user:{
            id:user.id,
            username:user.username,
            email:user.email,
            role:user.role
        }
    };
}

module.exports = {
    register,
    login
};