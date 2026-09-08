// lib/db.js (o el archivo donde definiste la pool)
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  // CAMBIO CRÍTICO: De 10 a 100
  connectionLimit: 100, 
  queueLimit: 0
});