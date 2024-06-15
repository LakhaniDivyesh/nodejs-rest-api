const mysql = require('mysql2');

var conn = {};

conn = {
    host : process.env.DATABASE_HOST,
    user : process.env.DATABASE_USER,
    password : process.env.DATABASE_PASSWORD,
    port:process.env.DATABASE_PORT,
    database : process.env.DATABASE_NAME,
    multipleStatements : true,
    dateStrings : 'date'
}

const database = mysql.createPool(conn);

module.exports = database;