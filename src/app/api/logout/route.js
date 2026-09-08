import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { pool } from '@/lib/db';

export async function POST(request) {
  try {
    // Usamos .catch por si la petición viene vacía (ej. un usuario dándole a Salir)
    const body = await request.json().catch(() => ({})); 
    const { userId, action } = body;

    // 1. Leemos la Cookie de la persona que está ejecutando la acción (Usuario o Admin)
    const tokenSesion = request.cookies.get('sesion_usuario')?.value;

    let peticionarioId = null;
    let sessionDbId = null;

    // 2. Desencriptamos el JWT para saber quién está haciendo la petición
    if (tokenSesion) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(tokenSesion, secret);
        peticionarioId = payload.id;
        sessionDbId = payload.sesion_db_id; // Sacamos el UUID real de la base de datos
      } catch(e) {
        console.log("Token inválido o expirado al hacer logout");
      }
    }

    // Obtener el último evento registrado y su estado
    const [asamblea] = await pool.query('SELECT fecha_inicio, activa FROM control_asamblea ORDER BY id DESC LIMIT 1');
    const evento = asamblea[0] || {};
    const eventoEnCurso = evento.activa === 1 || evento.activa === '1';

    // ==========================================
    // A) CIERRE DE SESIÓN MASIVO
    // ==========================================
    if (action === 'logout_all') {
      if (eventoEnCurso && evento.fecha_inicio) {
        await pool.query(`
                UPDATE usuarios 
                SET 
                    minutos_acumulados = minutos_acumulados + GREATEST(0, TIMESTAMPDIFF(MINUTE, GREATEST(ultimo_login, ?), NOW())),
                    estado = 'Offline' , ultimo_logout = NOW()
                WHERE rol != 'Admin' AND rol != 'admin' AND estado = 'Online'
            `, [evento.fecha_inicio]);
      } else {
        await pool.query("UPDATE usuarios SET estado = 'Offline' WHERE rol != 'Admin' AND rol != 'admin'");
      }

      await pool.query(`
        DELETE s FROM sesiones_activas s
        JOIN usuarios u ON s.usuario_id = u.id
        WHERE u.rol != 'Admin' AND u.rol != 'admin'
      `);

      return NextResponse.json({ success: true, message: 'Todos los usuarios fueron desconectados' });
    }

    // ==========================================
    // B) CIERRE DE SESIÓN INDIVIDUAL
    // ==========================================
    
    // ¿A quién vamos a desconectar? 
    // Si viene userId en el body, es un Admin expulsando a alguien. Si no, es el propio usuario cerrando su sesión.
    const targetUserId = userId || peticionarioId;

    if (!targetUserId) {
      return NextResponse.json({ error: 'No se pudo identificar al usuario a desconectar' }, { status: 400 });
    }

    // Liberar el cupo exacto en la base de datos
    if (targetUserId === peticionarioId && sessionDbId) {
      // El usuario se está desconectando a SÍ MISMO: Borramos solo su ventana actual
      await pool.query('DELETE FROM sesiones_activas WHERE sesion_token = ?', [sessionDbId]);
    } else {
      // Un ADMIN está expulsando al usuario: Le cerramos TODAS sus ventanas forzosamente
      await pool.query('DELETE FROM sesiones_activas WHERE usuario_id = ?', [targetUserId]);
    }

    // Cuenta si le quedan otras ventanas abiertas a ese usuario
    const [sesionesRestantes] = await pool.query(
      'SELECT COUNT(*) as total FROM sesiones_activas WHERE usuario_id = ?',
      [targetUserId]
    );

    // Cambia a offline solo si ya no le quedan ventanas abiertas (total = 0)
    if (sesionesRestantes[0].total === 0) {
      if (eventoEnCurso && evento.fecha_inicio) {
        await pool.query(`
        UPDATE usuarios 
            SET 
                minutos_acumulados = minutos_acumulados + GREATEST(0, TIMESTAMPDIFF(MINUTE, GREATEST(ultimo_login, ?), NOW())),
                estado = 'Offline', ultimo_logout = NOW() 
            WHERE id = ?
        `, [evento.fecha_inicio, targetUserId]);
      } else {
        await pool.query("UPDATE usuarios SET estado = 'Offline' WHERE id = ?", [targetUserId]);
      }
    }

    // Preparamos la respuesta final
    const response = NextResponse.json({ success: true, message: 'Usuario desconectado correctamente' });

    // ¡SOLUCIÓN AL SUICIDIO DE ADMIN!
    // Solo destruimos la cookie del navegador si el usuario se está desconectando a sí mismo.
    // Si el Admin está expulsando a Carlos, NO debemos borrar la cookie del Admin.
    if (targetUserId === peticionarioId) {
        response.cookies.delete('sesion_usuario');
    }

    return response;

  } catch (error) {
    console.error("Error en Logout API:", error);
    return NextResponse.json({ error: 'Error al procesar el cierre de sesión' }, { status: 500 });
  }
}