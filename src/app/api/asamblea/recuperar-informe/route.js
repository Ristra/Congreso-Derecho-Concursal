import { NextResponse } from 'next/server';
import { pool } from '@/lib/db'; 

export async function GET() {
    try {
        // 1. Obtener la información del ÚLTIMO evento (para que sea dinámico)
        const [asambleaLast] = await pool.query(`
            SELECT fecha_inicio, fecha_fin, porcentaje_min_asistencia, 
                cliente_empresa, nombre_evento, fecha_evento_texto 
            FROM control_asamblea 
            ORDER BY id DESC LIMIT 1
        `);
        
        if (!asambleaLast || asambleaLast.length === 0) {
            return NextResponse.json({ success: false, error: 'No hay eventos registrados' }, { status: 404 });
        }

        // CÁLCULO DINÁMICO DE LA DURACIÓN DEL EVENTO
        const evento = asambleaLast[0];
        const inicioEvento = evento.fecha_inicio ? new Date(evento.fecha_inicio) : new Date();
        const fechaCierre = evento.fecha_fin ? new Date(evento.fecha_fin) : new Date();
        const duracionEventoMinutos = Math.max(1, Math.floor((fechaCierre - inicioEvento) / 60000));
        const minutosRequeridos = duracionEventoMinutos * 0; 

        // 2. Extraer todos los usuarios (Con la misma consulta de tu cierre en caliente)
        const [usuarios] = await pool.query(`
          SELECT u.nombre, u.nombre_empresa, u.coeficiente, u.estado, u.ultimo_login, u.id_representante, u.minutos_acumulados,
                 a.modo_asistencia, a.celular, a.ip, a.primer_login, rep.nombre as nombre_representante_legal
          FROM usuarios u
          LEFT JOIN asistencia a ON u.id = a.usuario_id
          LEFT JOIN usuarios rep ON u.id_representante = rep.id
          WHERE u.rol NOT IN ('Admin', 'admin') 
          ORDER BY u.nombre_empresa ASC
        `);

        // 3. Obtener las preguntas
        let preguntasPendientes = [];
        let preguntasRespondidas = [];
        try {
            const [pregRows] = await pool.query(`
              SELECT autor, email, pregunta, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') as fecha_formateada 
              FROM preguntas_qa 
              WHERE estado = 'pendiente' OR estado = 'Pendiente'
              ORDER BY fecha ASC
            `);
            preguntasPendientes = pregRows;

            const [respRows] = await pool.query(`
              SELECT autor, email, pregunta, estado, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') as fecha_formateada 
              FROM preguntas_qa 
              WHERE estado IN ('respondida', 'descartada', 'Respondida', 'Descartada')
              ORDER BY fecha DESC
            `);
            preguntasRespondidas = respRows;
        } catch (e) {
            console.error("Error obteniendo preguntas:", e);
        }

        // 4. Variables para las estadísticas
        let totalCoeficientePresente = 0;
        let totalPresentes = 0;
        let totalPoderes = 0;
        let asistentesVirtual = 0;
        let asistentesPresencial = 0;

        const [configRows] = await pool.query('SELECT quorum_base FROM configuracion WHERE id = 1');
        const baseQuorum = configRows.length > 0 ? parseFloat(configRows[0].quorum_base) : 100;

        // 5. Mapeo de Usuarios (LA LÓGICA CLONADA EXACTA DE TU OTRO BOTÓN)
        const reporteUsuarios = usuarios.map(u => {
                const coef = parseFloat(u.coeficiente || 0);
                let m = parseInt(u.minutos_acumulados) || 0;

                let horaInicioStr = '-';
                let horaFinStr = '-';
                let tiempoTotal = '0m';
                let clasificacion = 'Ausente';

                const loginDate = u.ultimo_login ? new Date(u.ultimo_login) : null;
                const primerLoginDate = u.primer_login ? new Date(u.primer_login) : null;
                // VARIABLE PARA LA HORA EXACTA DE SALIDA
                const logoutDate = u.ultimo_logout ? new Date(u.ultimo_logout) : null;

                let startDate = inicioEvento;
                let endDate = fechaCierre;

                if (m > 0 || u.estado === 'Online') {
                    
                    // ========================================================
                    // 1. REGLA DE HORA DE INICIO (Intacta)
                    // ========================================================
                    if (primerLoginDate) {
                        if (primerLoginDate < inicioEvento) {
                            startDate = inicioEvento;
                        } else {
                            startDate = primerLoginDate;
                        }
                    } else if (loginDate && loginDate >= inicioEvento) {
                        startDate = loginDate;
                    }

                    // ========================================================
                    // 2. REGLA DE HORA DE CIERRE (Corregida con ultimo_logout)
                    // ========================================================
                    if (u.estado === 'Online') {
                        endDate = fechaCierre; // Se quedó hasta el final
                    } else if (logoutDate && logoutDate >= startDate && logoutDate <= fechaCierre) {
                        // Si fue desconectado, usamos la hora milimétrica en la que salió
                        endDate = logoutDate;
                    } else {
                        // Si no hay fecha de logout, sumamos sus minutos a su inicio
                        endDate = new Date(startDate.getTime() + (m * 60000));
                        if (endDate > fechaCierre) endDate = fechaCierre;
                    }

                    if (startDate > endDate) startDate = inicioEvento;

                    // ========================================================
                    // 3. BLINDAJE VISUAL Y TOPES
                    // ========================================================
                    let minutosVisuales = Math.floor((endDate - startDate) / 60000);
                    if (minutosVisuales < 0) minutosVisuales = 0;
                    
                    let minutosFinalesReporte = m > 0 ? m : minutosVisuales;
                    
                    if (minutosFinalesReporte > minutosVisuales) {
                        minutosFinalesReporte = minutosVisuales;
                    }
                    if (minutosFinalesReporte > duracionEventoMinutos) {
                        minutosFinalesReporte = duracionEventoMinutos;
                    }

                    horaInicioStr = startDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                    horaFinStr = endDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                    
                    const hrs = Math.floor(minutosFinalesReporte / 60);
                    const mins = minutosFinalesReporte % 60;
                    tiempoTotal = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                    
                    clasificacion = minutosFinalesReporte >= minutosRequeridos ? 'Presente' : 'Ausente';
                }

                const isPresenteReporte = clasificacion === 'Presente';

                if (isPresenteReporte) {
                    totalCoeficientePresente += coef;
                    totalPresentes++;
                    if (u.modo_asistencia === 'Presencial') {
                        asistentesPresencial++;
                        clasificacion = 'Presencial';
                    } else {
                        asistentesVirtual++;
                        clasificacion = 'Virtual';
                    }
                } else {
                    clasificacion = 'Ausente';
                }

                return {
                    usuario: u.nombre || u.nombre_empresa,
                    empresa: u.nombre_empresa || '-',
                    email: u.email,
                    coeficiente: coef.toFixed(2),
                    estado: isPresenteReporte ? 'Presente' : 'Ausente',
                    modo: u.modo_asistencia || 'No definido',
                    clasificacion_final: clasificacion,
                    hora_inicio: horaInicioStr,
                    hora_fin: horaFinStr,
                    tiempo_total: tiempoTotal,
                    ip: u.ip || 'No registrada'
                };
            });

        // 6. Empaquetar Stats y retornar
        const totalRegistrados = usuarios.length;
        const usuariosConectados = usuarios.filter(u => u.minutos_acumulados > 0 || u.primer_login !== null);
        const totalConectados = usuariosConectados.length;
        const porcentajeAsistenciaReal = totalRegistrados > 0
            ? (totalPresentes / totalRegistrados) * 100
            : 0;

        const totalMinutosTodos = usuariosConectados.reduce((acc,curr) => acc + (curr.minutos_acumulados || 0), 0);

        const stats = {
            total_registrados: totalRegistrados,
            total_minutos:totalMinutosTodos,
            info_carta: evento,
            total_usuarios_habiles: totalRegistrados,
            quorum_base_configurado: baseQuorum.toFixed(2),
            total_coeficiente_presente: totalCoeficientePresente.toFixed(2),
            porcentaje_asistencia: porcentajeAsistenciaReal.toFixed(2),
            total_presentes_fisicos: totalPresentes,
            virtual: asistentesVirtual,
            presencial: asistentesPresencial,
            poderes: totalPoderes
        };

        return NextResponse.json({ success: true, reportData: reporteUsuarios, stats, preguntasPendientes, preguntasRespondidas });

    } catch (error) {
        console.error('Error recuperando informe:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}