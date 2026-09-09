import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import crypto from 'crypto';


export async function POST(request) {
  try {
    // Extraer credenciales enviadas por el usuario
    const { cedula, password } = await request.json();
    
    if (!cedula || !password) {
      return NextResponse.json({error: 'Faltan credenciales'}, { status: 400 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : (request.socket?.remoteAddress || '0.0.0.0');

    // Buscamos al usuario en la tabla usuarios
    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE cedula = ?',
      [cedula]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const usuario = rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida){
      return NextResponse.json({error: 'Credenciales inválidas'}, {status: 401});
    }


    await pool.query(
      "DELETE FROM sesiones_activas WHERE ultima_actividad < NOW() - INTERVAL 2 MINUTE"
    );
    
    const esAdmin = usuario.rol?.toLowerCase().trim() === 'admin';

    // Limite de sesiones
    const [sesionesActuales] = await pool.query(
      'SELECT COUNT(*) as total FROM sesiones_activas WHERE usuario_id = ?',
      [usuario.id]
    );

    if (!esAdmin && sesionesActuales[0].total >= 2) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de 2 conexiones simultáneas permitidas.' },
        { status: 403 }
      );
    }

    // Al pasar la validación, se registra la nueva sesión
    const tokenSesion = crypto.randomUUID();
    await pool.query(
      'INSERT INTO sesiones_activas (usuario_id, sesion_token) VALUES (?,?)',
      [usuario.id, tokenSesion]
    );

    const [asamblea] = await pool.query('SELECT fecha_inicio FROM control_asamblea ORDER BY id DESC LIMIT 1');
    const fechaInicioEvento = asamblea[0]?.fecha_inicio ? asamblea[0].fecha_inicio : new Date();

    // 2. Actualizar el estado y el primer_login con el blindaje de eventos pasados
    await pool.query(`
        UPDATE usuarios u
        JOIN asistencia a ON u.id = a.usuario_id
        SET             
            u.ultimo_login = CASE WHEN u.estado = 'Online' THEN u.ultimo_login ELSE NOW() END,
            u.estado = 'Online',
            a.primer_login = CASE 
                WHEN a.primer_login IS NULL THEN NOW()
                WHEN a.primer_login < ? THEN NOW()
                ELSE a.primer_login
            END
        WHERE u.id = ?
    `, [fechaInicioEvento, usuario.id]);


    // 3. CORRECCIÓN CRÍTICA: Verificar si ya existe en la tabla asistencia
    const [existeAsistencia] = await pool.query(
      'SELECT id FROM asistencia WHERE usuario_id = ?',
      [usuario.id]
    );

    if (existeAsistencia.length > 0) {
      // Si ya existe, solo actualizamos la IP de forma segura sin borrar el nombre
      await pool.query(
        "UPDATE asistencia SET ip = ? WHERE usuario_id = ?",
        [ip, usuario.id]
      );
    } else {
      const nombreAsistencia = usuario.nombre_representante || usuario.nombre || null;
      // SI NO EXISTE (Caso del usuario nuevo), creamos la fila e inyectamos 
      // los datos del usuario (incluyendo el nombre_representante que viene de la tabla usuarios)
      await pool.query(
        `INSERT INTO asistencia (usuario_id, modo_asistencia, nombre_empresa, nit, email, ip, nombre_representante) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          usuario.id,
          usuario.modo_asistencia || 'Virtual',
          usuario.nombre_empresa || '',
          usuario.nit || '',
          usuario.email,
          ip,
          usuario.nombre
        ]
      );
    }
    
    const perfilSeguro = {
      id: usuario.id,
      nombre: usuario.nombre,
      nombre_empresa: usuario.nombre_empresa,
      email: usuario.email,
      rol : usuario.rol,
      estado: 'online'
    };

    const response = NextResponse.json({
      success: true,
      usuario: perfilSeguro
    });
    
    // Crear Payload para el JWT
    const jwtPayload = {
      id: usuario.id,
      rol: usuario.rol,
      nombre: usuario.nombre,
      session_db_id: tokenSesion
    };

    // Prepara la firma con 'jose'
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const alg = 'HS256';

    // Generar el token JWT
    const tokenJWT = await new SignJWT(jwtPayload)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime('12h') // token expira en 12h
      .sign(secret);

      // Adjuntar la cookie HttpOnly a la respuesta     
      response.cookies.set('sesion_usuario', tokenJWT, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 12
      });

      return response;

  } catch (error) {
    console.error('Error en el login', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
