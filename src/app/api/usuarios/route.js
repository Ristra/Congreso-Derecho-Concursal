import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/hash';

export async function GET() {
  try {
    const [rows] = await pool.query(`
        SELECT 
            u.id,
            u.nombre,
            u.nombre_empresa,
            u.nit,
            u.email,
            u.coeficiente,
            u.rol,
            u.estado,
            u.id_representante,
            u.es_habilitado,
            u.registro_completado,
            u.ultimo_login,
            u.ultimo_logout,
            u.correo_enviado,
            a.nombre_representante as asistencia_representante,
            a.nombre_empresa as asistencia_empresa,
            a.celular as contacto_celular,
            a.nombre_asistente,
            a.cedula_asistente,
            a.celular_asistente as contacto_asistente,
            a.restricciones_alimentacion,
            a.modo_asistencia,
            a.archivos_poder 
        FROM usuarios u 
        LEFT JOIN asistencia a ON u.id = a.usuario_id 
        ORDER BY u.id ASC
    `);
    
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo usuario
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, nombre_empresa, nit, email, password, coeficiente, rol, id_representante } = body;

    const identificador = nombre || nombre_empresa;

    if (!identificador || !email || !password) {
      return NextResponse.json({ error: 'Debe ingresar al menos un Nombre o una Empresa, además del Email y Contraseña' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO usuarios (nombre, nombre_empresa, nit, email, password, coeficiente, rol, estado, id_representante, es_habilitado, registro_completado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)',
      [
        nombre || '', 
        nombre_empresa || '', 
        nit || '',
        email, 
        await hashPassword(password), 
        coeficiente || 1.00, 
        rol || 'User', 
        'Offline',
        id_representante || null 
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar usuario
export async function DELETE(request) {
  try {
    // 1. Extraemos todo el cuerpo (body) de la petición
    const body = await request.json();

    // 2. Evaluamos qué acción nos están pidiendo
    if (body.accion === 'masivo') {
      
      // --- LÓGICA DE BORRADO MASIVO ---
      // Protegemos a los administradores usando la condición WHERE rol != 'Admin'
      const query = "DELETE FROM usuarios WHERE rol != 'Admin'";
      const [result] = await pool.query(query);

      return NextResponse.json({ 
        success: true, 
        message: `¡Limpieza exitosa! Se han eliminado ${result.affectedRows} usuarios (rol 'User'). Los administradores están a salvo.` 
      }, { status: 200 });

    } else if (body.id) {
      
      // --- LÓGICA DE BORRADO INDIVIDUAL ---
      const { id } = body;
      await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
      
      return NextResponse.json({ 
        success: true,
        message: "Usuario eliminado correctamente." 
      }, { status: 200 });

    } else {
      
      // Si el frontend no mandó ni 'accion' ni 'id', rechazamos la petición
      return NextResponse.json({ 
        error: "Petición incorrecta. Faltan datos (id o accion)." 
      }, { status: 400 });
      
    }

  } catch (error) {
    console.error("Error en la API de eliminación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Editar un usuario existente
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nombre, nombre_empresa, nit, email, password, coeficiente, rol, id_representante, es_habilitado, modo_asistencia } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const representanteFinal = id_representante ? id_representante : null;

    let query = 'UPDATE usuarios SET nombre = ?, nombre_empresa = ?, nit = ?, email = ?, coeficiente = ?, rol = ?, id_representante = ?, es_habilitado = ?';
    const params = [nombre || '', nombre_empresa || '', nit, email, coeficiente, rol, representanteFinal, es_habilitado];

    if (password && password.trim() !== '') {
      const passwordHash = await hashPassword(password);
      query += ', password = ?';
      params.push(passwordHash);
    } 
    
    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    if (modo_asistencia === 'Sin Definir') {
        await pool.query('DELETE FROM asistencia WHERE usuario_id = ?', [id]);
        await pool.query('UPDATE usuarios SET registro_completado = 0 WHERE id = ?', [id]);
    }
    else if (modo_asistencia === 'Virtual' || modo_asistencia === 'Presencial') {
        const [existe] = await pool.query('SELECT id FROM asistencia WHERE usuario_id = ?', [id]);
        
        if (existe.length > 0) {
            await pool.query('UPDATE asistencia SET modo_asistencia = ? WHERE usuario_id = ?', [modo_asistencia, id]);
        } else {
            await pool.query(
                `INSERT INTO asistencia (usuario_id, modo_asistencia, nombre_empresa, nit, email) 
                 VALUES (?, ?, ?, ?, ?)`, 
                [id, modo_asistencia, nombre_empresa || '', nit || '', email]
            );
        }
        await pool.query('UPDATE usuarios SET registro_completado = 1 WHERE id = ?', [id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error PUT Usuario:", error); 
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}