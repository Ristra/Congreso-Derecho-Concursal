import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import CredencialesTemplate from '@/app/emails/credencialesTemplate';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/hash';
import { generaPassword } from '@/lib/utils'
import { decrypt } from '@/lib/encryption';

// 1. TRANSPORTE OPTIMIZADO (Pooling activado)
const transporter = nodemailer.createTransport({
    pool: true, // Mantiene la conexión abierta para lotes
    maxConnections: 5, // Permite enviar 5 correos simultáneos
    host: "mail.derechoconcursal.org",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function POST(request) {
    try {
        //const { usuarios } = await request.json();
        const [usuarios] = await pool.query(
            `SELECT
                id,
                email,
                nombre,
                password,
                correo_enviado,
                cedula
            FROM usuarios
            WHERE correo_enviado = 0 AND rol = 'user'`
        );
        console.log("Total de usuario recibidos:", usuarios.length)

        usuarios.forEach((usuario, index) => {
            console.log(`USUARIO ${index + 1}:`);
            console.log(`ID: ${usuario.id}`); 
            console.log(`Email: ${usuario.email}`);
            console.log(`Cedula: ${usuario.cedula}`);
            console.log(`Nombre ${usuario.nombre}`);
            console.log(`Password existe? ${usuario.hasOwnProperty('password')}`);

            console.log(`Password tipo: ${typeof usuario.password}`);
            console.log(`Password valor: ${JSON.stringify(usuario.password)}`)
            console.log(`Password longitud: ${usuario.password?.length ||0}`);
            console.log(`Password es null? ${usuario.password === null}`);
            console.log(`Password es undefined? ${usuario.password === undefined}`);

            console.log(`Password es string vacío? ${usuario.password === ''}`);
            console.log(`Correo_enviado: ${usuario.correo_enviado}`);
        })

        if (!usuarios || usuarios.length === 0){
            return NextResponse.json({ error: 'No se enviaron usuarios' }, { status: 400 });
        }

        // 2. PROCESAMIENTO EN PARALELO (Sin for...of)
        const promesasDeEnvio = usuarios.map(async (usuario) => {
            try {

                let passwordPlano = null;
                console.log("contraseñas de los usuarios", usuario.password);

                if (usuario.password && usuario.password !== '' && usuario.password !== null){
                    try {
                        passwordPlano = decrypt(usuario.password);

                        console.log("Contraseñas", passwordPlano)
                        /*                    
                        if (!passwordPlano || passwordPlano.trimEnd() === ''){
                            console.log(`El usuario ${usuario.email} no cuenta con una contraseña, se creará una aleatoria...`)
                            passwordPlano = generaPassword(12);
                        }*/
                    } catch (decryptError){
                        console.error(`Error al desencriptar para ${usuario.email}`)
                    }
                } else {
                    passwordPlano = generaPassword(12);
                }
                // Renderizado
                const correoHtml = await render(CredencialesTemplate({
                    nombreUsuario: usuario.nombre,
                    correoUsuario: usuario.cedula,
                    passwordGenerada: passwordPlano,
                    urlLogin: 'https://congreso.derechoconcursal.org/login'
                }));

                // Envío
                await transporter.sendMail({
                    from: `"Congreso Derecho Concursal" <${process.env.SMTP_USER}>`,
                    to: usuario.email,
                    subject: 'Bienvenido a el XX Congreso Colombiano de Derecho Concursal',
                    html: correoHtml,
                });

                const passwordHash = await hashPassword(passwordPlano);

                // Actualización en BD
                await pool.query(
                    'UPDATE usuarios SET password = ?, correo_enviado = 1 WHERE id = ?',
                    [passwordHash, usuario.id]
                );

                return { exito: true, email: usuario.email };
            } catch (error) {
                console.error(`Error enviando correo a ${usuario.email}:`, error);
                return { exito: false, email: usuario.email };
            }
        });

        // 3. ESPERAR A QUE TODOS TERMINEN SIMULTÁNEAMENTE
        const resultados = await Promise.all(promesasDeEnvio);
        
        const enviados = resultados.filter(resultado => resultado.exito).length;
        const fallidos = resultados.filter(resultado => !resultado.exito).length;

        return NextResponse.json({
            mensaje: 'Lote procesado exitosamente',
            enviados,
            fallidos
        });

    } catch (error) {
        console.error('Error general en la API de correos:', error);
        return NextResponse.json({error: 'Error procesando el envío másivo'}, {status:500});
    }
}