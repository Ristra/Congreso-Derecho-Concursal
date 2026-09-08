import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function POST(request) {
  try {
    const usuarios = await request.json();

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return NextResponse.json({ error: 'Formato inválido o lista vacía' }, { status: 400 });
    }

    let createdCount = 0;
    let errorCount = 0;
    let updatedPowersCount = 0;
    let correosPendientes = [];

    // --- PASO 1: CREACIÓN / VERIFICACIÓN DE USUARIOS ---
    for (const u of usuarios) {
      const nombre = u['Nombre_Representante'] || u['nombre'] || '';
      const empresa = u['Nombre_Empresa'] || u['nombre_empresa'] || '';
      const nit = u['NIT'] || u['nit'] || '';
      const email = u['Email'] || u['email'];
      const password = u['Password'] || u['password'];



      const coeficiente = u['Coeficiente'] || u['coeficiente'] || 1.00;
      const rol = u['Rol'] || u['rol'] || 'User';

      if (!email || (!nombre && !empresa)) {
        errorCount++;
        continue;
      }

      let userId = null;

      try {
        const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);

        let passwordToStore = null;

        if (password && password !== '' && password !== null) {
          const passwordString = String(password).trim();
          if (passwordString.length > 0) {
            passwordToStore = encrypt(passwordString);
          }
        }

        if (existing.length === 0) {
          const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, nombre_empresa, nit, email, password, coeficiente, rol, estado) VALUES (?, ?, ?, ?,  ?, ?, ?, ?)',
            [nombre, empresa, nit, email, passwordToStore, coeficiente, rol, 'Offline']
          );
          userId = result.insertId;
          createdCount++;

          correosPendientes.push({
            nombre: nombre || empresa,
            email: email,
            password: passwordToStore,

          });
        } else {
          userId = existing[0].id;
        }

        // --- NUEVA LÓGICA DE IMPORTACIÓN DE ASISTENCIA ---
        // Si el excel trae datos de asistencia, actualizamos la tabla 'asistencia'
        const celular = u['Celular_Contacto'] || '';
        const modo = u['Modo'] || '';
        const nomAsis = u['Nombre_Asistente'] || '';
        const cedAsis = u['Cedula_Asistente'] || '';
        const celAsis = u['Celular_Asistente_Real'] || ''; // Ojo con el nombre de columna en excel
        const restri = u['Restricciones'] || '';
        // --- NUEVA COLUMNA LINK PODERES ---
        const linkPoderes = u['Link_Poderes'] || u['link_poderes'] || '';
        let processedPoderes = '';

        if (linkPoderes) {
          // Limpiamos el dominio para guardar solo la ruta relativa
          processedPoderes = linkPoderes.split(',').map(l => {
            let clean = l.trim();
            // Removemos el dominio si viene
            return clean.replace('https://acotur.ristra.co', '');
          }).join(',');
        }

        // Si hay un modo de asistencia definido O si hay un link de poder, intentamos actualizar
        if (userId && (modo === 'Virtual' || modo === 'Presencial' || processedPoderes !== '')) {
          const [asisExist] = await pool.query('SELECT id FROM asistencia WHERE usuario_id = ?', [userId]);

          if (asisExist.length > 0) {
            // Construimos query dinámico para no borrar datos si no vienen
            let updateQuery = 'UPDATE asistencia SET celular = ?, nombre_asistente = ?, cedula_asistente = ?, celular_asistente = ?, restricciones_alimentacion = ?, modo_asistencia = ?';
            const updateParams = [celular, nomAsis, cedAsis, celAsis, restri, modo];

            if (processedPoderes) {
              updateQuery += ', archivos_poder = ?';
              updateParams.push(processedPoderes);
            }

            updateQuery += ' WHERE usuario_id = ?';
            updateParams.push(userId);

            await pool.query(updateQuery, updateParams);
          } else {
            await pool.query(`
              INSERT INTO asistencia (usuario_id, nombre_empresa, nit, email, celular, nombre_asistente, cedula_asistente, celular_asistente, restricciones_alimentacion, modo_asistencia, archivos_poder)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, empresa, nit, email, celular, nomAsis, cedAsis, celAsis, restri, modo, processedPoderes]);
          }
          // Marcar registro completado
          await pool.query('UPDATE usuarios SET registro_completado = 1 WHERE id = ?', [userId]);
        }

      } catch (dbError) {
        console.error("Error procesando usuario:", dbError);
        errorCount++;
      }
    }

    // --- PASO 2: ASIGNACIÓN DE PODERES ---
    for (const u of usuarios) {
      const emailUsuario = u['Email'] || u['email'];
      const emailRepresentante = u['Email_Representante'] || u['email_representante'];

      if (emailUsuario && emailRepresentante && emailRepresentante.trim() !== '') {
        try {
          const [repData] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [emailRepresentante]);
          if (repData.length > 0) {
            const idRepresentante = repData[0].id;
            if (emailUsuario !== emailRepresentante) {
              await pool.query('UPDATE usuarios SET id_representante = ? WHERE email = ?', [idRepresentante, emailUsuario]);
              updatedPowersCount++;
            }
          }
        } catch (err) {
          console.error(`Error asignando poder`, err);
        }
      } else if (emailUsuario) {
        await pool.query('UPDATE usuarios SET id_representante = NULL WHERE email = ?', [emailUsuario]);
      }
    }

    console.log(`Listo para enviar ${correosPendientes.length} correos de bienvenida.`);
    return NextResponse.json({
      success: true,
      created: createdCount,
      errors: errorCount,
      powersUpdated: updatedPowersCount,
      message: `Proceso finalizado. Creados: ${createdCount}, Poderes Asignados: ${updatedPowersCount}`
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}