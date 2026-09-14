import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCurrentQuorum(pool) {
    const [quorumResult] = await pool.query(`
      SELECT SUM(u.coeficiente) as total 
      FROM usuarios u
      LEFT JOIN usuarios rep ON u.id_representante = rep.id
      WHERE (u.estado = 'Online' OR rep.estado = 'Online')
      AND u.rol NOT IN ('Admin', 'admin')
  `);

    const totalPresente = parseFloat(quorumResult[0].total) || 0;
    const [configRows] = await pool.query('SELECT quorum_base FROM configuracion WHERE id = 1');
    const base = configRows.length > 0 ? parseFloat(configRows[0].quorum_base) : 100;

    if (base === 0) return 0;
    return ((totalPresente / base) * 100).toFixed(2);
}

// --- GET ---
export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const tokenSesion = cookieStore.get('sesion_usuario')?.value;

        if (tokenSesion) {
            try {
                const secret = new TextEncoder().encode(process.env.JWT_SECRET);
                const { payload } = await jwtVerify(tokenSesion, secret);

                if (payload.session_db_id) {
                    await pool.query(
                        'UPDATE sesiones_activas SET ultima_actividad = NOW() WHERE sesion_token = ?',
                        [payload.session_db_id]
                    );
                }
            } catch (e) {
            }
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        let config = { quorum_base: 100, video_url: '', google_form_url: '', enlace_auxiliar: '', youtube_controls: 1 };
        try {
            const [configRows] = await pool.query('SELECT * FROM configuracion WHERE id = 1');
            if (configRows.length > 0) config = configRows[0];
        } catch (e) { }

        const [docs] = await pool.query('SELECT * FROM documentos ORDER BY fecha DESC');

        const [quorumResult] = await pool.query(`
      SELECT SUM(u.coeficiente) as total 
      FROM usuarios u
      LEFT JOIN usuarios rep ON u.id_representante = rep.id
      WHERE (u.estado = 'Online' OR rep.estado = 'Online')
      AND u.rol NOT IN ('Admin', 'admin')
    `);

        const totalPresente = parseFloat(quorumResult[0].total) || 0;
        const base = parseFloat(config.quorum_base) || 100;
        const quorumPorcentaje = base > 0 ? (totalPresente / base) * 100 : 0;

        let asambleaActiva = null;
        try {
            const [activeRows] = await pool.query("SELECT * FROM control_asamblea WHERE activa = 1 LIMIT 1");
            if (activeRows.length > 0) asambleaActiva = activeRows[0];
        } catch (e) { }

        let myPower = 0;
        let amIRepresented = false;
        let myStatus = { es_habilitado: 1, modo_asistencia: 'Virtual' };
        let representadosNombres = [];

        if (userId) {
            const tokenSesion = request.cookies.get('sesion_usuario')?.value;

            if (tokenSesion) {
                await pool.query(
                    'UPDATE sesiones_activas SET ultima_actividad = NOW() WHERE sesion_token = ?',
                    [tokenSesion]
                );
            } else {
                await pool.query(
                    'UPDATE sesiones_activas SET ultima_actividad = NOW() WHERE usuario_id = ?',
                    [userId]
                );
            }

            const [me] = await pool.query(`
            SELECT u.coeficiente, u.id_representante, u.es_habilitado, a.modo_asistencia 
            FROM usuarios u
            LEFT JOIN asistencia a ON u.id = a.usuario_id
            WHERE u.id = ?
        `, [userId]);

            if (me.length > 0) {
                myStatus.es_habilitado = me[0].es_habilitado;
                myStatus.modo_asistencia = me[0].modo_asistencia || 'Virtual';

                if (me[0].id_representante) {
                    myPower = 0;
                    amIRepresented = true;
                } else {
                    const myBase = parseFloat(me[0].coeficiente || 0);

                    const [others] = await pool.query(`
                    SELECT nombre, nombre_empresa, coeficiente 
                    FROM usuarios 
                    WHERE id_representante = ? 
                `, [userId]);

                    let extraPower = 0;
                    others.forEach(o => {
                        extraPower += parseFloat(o.coeficiente || 0);
                        representadosNombres.push(o.nombre_empresa || o.nombre);
                    });

                    myPower = (myBase + extraPower).toFixed(2);
                }
            }
        }

        // --- VOTACIÓN EN VIVO ---
        let activePoll = null;
        let results = { total: 0, opciones: {} };

        const [pollRows] = await pool.query('SELECT * FROM votaciones WHERE activa = 1 LIMIT 1');
        if (pollRows.length > 0) {
            activePoll = pollRows[0];
            if (!activePoll.tipo) {
                if (activePoll.opciones === '__TEXTO_LIBRE__') activePoll.type = 'abierta';
                else activePoll.type = 'unica';
            } else {
                activePoll.type = activePoll.tipo;
            }
            activePoll.opciones = activePoll.opciones ? activePoll.opciones.split(',') : [];

            const [votes] = await pool.query('SELECT respuesta, SUM(coeficiente) as suma FROM votos WHERE votacion_id = ? GROUP BY respuesta', [activePoll.id]);
            votes.forEach(v => {
                results.opciones[v.respuesta] = parseFloat(v.suma);
                results.total += parseFloat(v.suma);
            });

            if (activePoll.type === 'planchas') {
                const totalCoef = results.total;
                const cargosTotales = activePoll.cargos || 1;
                const cociente = totalCoef > 0 ? (totalCoef / cargosTotales) : 0;
                results.cociente = cociente;
                results.planchas_data = {};

                let cargosAsignadosDirectos = 0;
                activePoll.opciones.forEach(op => {
                    const votos = results.opciones[op] || 0;
                    const directos = cociente > 0 ? Math.floor(votos / cociente) : 0;
                    const residuo = cociente > 0 ? (votos - (directos * cociente)) : 0;
                    results.planchas_data[op] = { directos, residuo, restos: 0, total_cargos: directos };
                    cargosAsignadosDirectos += directos;
                });

                let cargosFaltantes = cargosTotales - cargosAsignadosDirectos;
                if (cargosFaltantes > 0 && cociente > 0) {
                    const planchasOrdenadasPorResiduo = [...activePoll.opciones].sort((a, b) => results.planchas_data[b].residuo - results.planchas_data[a].residuo);
                    for (let i = 0; i < cargosFaltantes; i++) {
                        const planchaGanadora = planchasOrdenadasPorResiduo[i % planchasOrdenadasPorResiduo.length];
                        if (planchaGanadora) {
                            results.planchas_data[planchaGanadora].restos += 1;
                            results.planchas_data[planchaGanadora].total_cargos += 1;
                        }
                    }
                }
            }
        }

        // --- RESULTADOS PROYECTADOS ---
        let projectedPoll = null;
        let projectedResults = { total: 0, opciones: {} };
        try {
            const [projRows] = await pool.query('SELECT * FROM votaciones WHERE proyectada = 1 LIMIT 1');
            if (projRows.length > 0) {
                projectedPoll = projRows[0];
                if (!projectedPoll.tipo) {
                    if (projectedPoll.opciones === '__TEXTO_LIBRE__') projectedPoll.type = 'abierta';
                    else projectedPoll.type = 'unica';
                } else {
                    projectedPoll.type = projectedPoll.tipo;
                }
                projectedPoll.opciones = projectedPoll.opciones ? projectedPoll.opciones.split(',') : [];

                const [projVotes] = await pool.query('SELECT respuesta, SUM(coeficiente) as suma FROM votos WHERE votacion_id = ? GROUP BY respuesta', [projectedPoll.id]);
                projVotes.forEach(v => {
                    projectedResults.opciones[v.respuesta] = parseFloat(v.suma);
                    projectedResults.total += parseFloat(v.suma);
                });

                if (projectedPoll.type === 'planchas') {
                    const totalCoef = projectedResults.total;
                    const cargosTotales = projectedPoll.cargos || 1;
                    const cociente = totalCoef > 0 ? (totalCoef / cargosTotales) : 0;
                    projectedResults.cociente = cociente;
                    projectedResults.planchas_data = {};

                    let cargosAsignadosDirectos = 0;
                    projectedPoll.opciones.forEach(op => {
                        const votos = projectedResults.opciones[op] || 0;
                        const directos = cociente > 0 ? Math.floor(votos / cociente) : 0;
                        const residuo = cociente > 0 ? (votos - (directos * cociente)) : 0;
                        projectedResults.planchas_data[op] = { directos, residuo, restos: 0, total_cargos: directos };
                        cargosAsignadosDirectos += directos;
                    });

                    let cargosFaltantes = cargosTotales - cargosAsignadosDirectos;
                    if (cargosFaltantes > 0 && cociente > 0) {
                        const planchasOrdenadasPorResiduo = [...projectedPoll.opciones].sort((a, b) => projectedResults.planchas_data[b].residuo - projectedResults.planchas_data[a].residuo);
                        for (let i = 0; i < cargosFaltantes; i++) {
                            const planchaGanadora = planchasOrdenadasPorResiduo[i % planchasOrdenadasPorResiduo.length];
                            if (planchaGanadora) {
                                projectedResults.planchas_data[planchaGanadora].restos += 1;
                                projectedResults.planchas_data[planchaGanadora].total_cargos += 1;
                            }
                        }
                    }
                }
            }
        } catch (e) { }

        let urlPdf = null;
        if (docs && docs.length > 0) {
            urlPdf = `/uploads/${docs[0].filename}`;
        }

        return NextResponse.json({
            quorum: quorumPorcentaje.toFixed(2),
            base: base,
            video: config.video_url,
            googleForm: config.google_form_url || '',
            enlaceAuxiliar: config.enlace_auxiliar || '',
            youtubeControls: config.youtube_controls !== undefined ? config.youtube_controls : 1, // NUEVO
            chatPrivado: config.chat_privado !== undefined ? config.chat_privado : 1,
            urlPdf: urlPdf,
            documents: docs,
            activePoll,
            results,
            projectedPoll,
            projectedResults,
            userPower: myPower,
            representadosNombres,
            amIRepresented,
            userInfo: myStatus,
            asambleaActiva
        });

    } catch (error) {
        console.error("Error API Asamblea GET:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// --- POST ---
export async function POST(request) {
    try {
        //const body = await request.json();
        //const { action } = body;

        const textBody = await request.text();
        if (!textBody) {
            return NextResponse.json(
                { error: 'El servidor no recibió datos (Body vacío' }, { status: 400 }
            );
        }
        const body = JSON.parse(textBody);
        const { action, userId, cliente_empresa, nombre_evento, fecha_evento_texto } = body;


        if (action === 'start_assembly') {
            const { cliente_empresa, nombre_evento, fecha_evento_texto } = body;
            await pool.query(`
                UPDATE usuarios u
                LEFT JOIN asistencia a ON u.id = a.usuario_id
                SET                    
                    u.minutos_acumulados = 0
                WHERE u.rol != 'Admin' AND u.rol != 'admin'
            `);

            await pool.query("UPDATE control_asamblea SET activa = 0, fecha_fin = NOW() WHERE activa = 1");

            const ahoraInicio = new Date();
            await pool.query(`
                INSERT INTO control_asamblea 
                (activa, fecha_inicio, nombre_evento, cliente_empresa, fecha_evento_texto) 
                VALUES (1, ?, ?, ?, ?)`,
                [ahoraInicio, nombre_evento, cliente_empresa, fecha_evento_texto]
            );

            await pool.query(`                
                UPDATE asistencia a
                JOIN usuarios u ON u.id = a.usuario_id
                SET a.primer_login = ?
                WHERE u.estado = 'Online' 
                AND (a.primer_login IS NULL OR a.primer_login < ?)
                AND u.rol NOT IN ('Admin', 'admin')
            `, [ahoraInicio, ahoraInicio]);

            return NextResponse.json({ success: true, message: 'Evento Iniciado' });
        }

        if (action === 'end_assembly') {
            const [asambleaActiva] = await pool.query('SELECT fecha_inicio FROM control_asamblea WHERE activa = 1 ORDER BY id DESC LIMIT 1');

            if (asambleaActiva.length > 0 && asambleaActiva[0].fecha_inicio) {
                const fechaInicio = asambleaActiva[0].fecha_inicio;
                await pool.query(`
                    UPDATE usuarios 
                    SET 
                        minutos_acumulados = minutos_acumulados + GREATEST(0, TIMESTAMPDIFF(MINUTE, GREATEST(ultimo_login, ?), NOW()))
                    WHERE rol != 'Admin' AND rol != 'admin' AND estado = 'Online'
                `, [fechaInicio]);
            }
            const fechaCierre = new Date();
            await pool.query("UPDATE control_asamblea SET activa = 0, fecha_fin = NOW() WHERE activa = 1");
            const [configRows] = await pool.query('SELECT quorum_base FROM configuracion WHERE id = 1');
            const baseQuorum = configRows.length > 0 ? parseFloat(configRows[0].quorum_base) : 100;

            const [usuarios] = await pool.query(`
              SELECT u.nombre, u.nombre_empresa, u.coeficiente, u.estado, u.ultimo_login, u.id_representante, u.minutos_acumulados, u.es_generico,
                     a.modo_asistencia, a.celular, a.ip, a.primer_login, rep.nombre as nombre_representante_legal
              FROM usuarios u
              LEFT JOIN asistencia a ON u.id = a.usuario_id
              LEFT JOIN usuarios rep ON u.id_representante = rep.id
              WHERE u.rol NOT IN ('Admin', 'admin') 
              ORDER BY u.nombre_empresa ASC
          `);
            // Obtener preguntas pendientes
            let preguntasPendientes = [];
            let preguntasRespondidas = [];
            try {
                // 1. Obtener pendientes
                const [pregRows] = await pool.query(`
                  SELECT autor, email, pregunta, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') as fecha_formateada 
                  FROM preguntas_qa 
                  WHERE estado = 'pendiente' OR estado = 'Pendiente'
                  ORDER BY fecha ASC
              `);
                preguntasPendientes = pregRows;

                // 2. Obtener respondidas
                const [respRows] = await pool.query(`
                  SELECT autor, email, pregunta, estado, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') as fecha_formateada 
                  FROM preguntas_qa 
                  WHERE estado IN ('respondida', 'descartada', 'Respondida', 'Descartada')
                  ORDER BY fecha DESC
              `);
                preguntasRespondidas = respRows;

            } catch (e) {
                console.error("Error obteniendo preguntas pendientes:", e);
            }

            let totalCoeficientePresente = 0;
            let totalPresentesReales = 0;
            let totalPresentesGenericos = 0;
            let totalPoderes = 0;
            let asistentesVirtual = 0;
            let asistentesPresencial = 0;

            // CÁLCULO DURACIÓN DEL EVENTO
            const inicioEvento = asambleaActiva.length > 0 && asambleaActiva[0].fecha_inicio
                ? new Date(asambleaActiva[0].fecha_inicio)
                : fechaCierre;
            const duracionEventoMinutos = Math.max(1, Math.floor((fechaCierre - inicioEvento) / 60000));
            const minutosRequeridos = duracionEventoMinutos * 0;  // PORCENTAJE MÍNIMO DE ASISTENCIA DEL TOTAL DEL EVENTO            

            const reporteUsuarios = usuarios.map(u => {
                const coef = parseFloat(u.coeficiente || 0);
                let m = parseInt(u.minutos_acumulados) || 0;

                let horaInicioStr = '-';
                let horaFinStr = '-';
                let tiempoTotal = '0m';
                let clasificacion = 'Ausente';

                const loginDate = u.ultimo_login ? new Date(u.ultimo_login) : null;
                const primerLoginDate = u.primer_login ? new Date(u.primer_login) : null;

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
                const esGenerico = u.es_generico === 1 || u.es_generico === true;

                if (isPresenteReporte) {
                    if (esGenerico) {
                        totalPresentesGenericos++;
                        clasificacion = 'Virtual';
                    } else {
                        totalCoeficientePresente += coef;
                        totalPresentesReales++;
                        if (u.modo_asistencia === 'Presencial') {
                            asistentesPresencial++;
                            clasificacion = 'Presencial';
                        } else {
                            asistentesVirtual++;
                            clasificacion = 'Virtual';
                        }
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
                    ip: u.ip || 'No registrada',
                    es_generico: u.es_generico === 1 || u.es_generico === true
                };
            });

            const [asambleaInfo] = await pool.query(`                
                SELECT cliente_empresa, nombre_evento, fecha_evento_texto 
                FROM control_asamblea 
                ORDER BY id DESC LIMIT 1
            `);

            const infoEventos = asambleaInfo[0] || {
                cliente_empresa: 'Cliente',
                nombre_evento: 'Evento',
                fecha_evento_texto: ''
            };
            
            const genericos = usuarios.filter(u => (u.es_generico === 1 || u.es_generico === true));
            const reales = usuarios.filter(u => !(u.es_generico === 1 || u.es_generico === true));
            const totalRegistradosReales = reales.length;
            const totalRegistradosGenericos = genericos.length;

            const usuariosConectados = usuarios.filter(u => u.minutos_acumulados > 0 || u.primer_login !== null);
            //const totalConectados = usuariosConectados.length;

            const porcentajeAsistenciaReal = totalRegistradosReales > 0
                ? (totalPresentesReales / totalRegistradosReales) * 100
                : 0;

            const totalMinutosTodos = usuariosConectados.reduce((acc, curr) => acc + (curr.minutos_acumulados || 0), 0);

            const stats = {
                total_registrados: totalRegistradosReales,
                total_genericos_registrados: totalRegistradosGenericos,
                info_carta: infoEventos,
                total_minutos: totalMinutosTodos,
                total_usuarios_habiles: totalRegistradosReales,
                quorum_base_configurado: baseQuorum.toFixed(2),
                total_coeficiente_presente: totalCoeficientePresente.toFixed(2),
                porcentaje_asistencia: porcentajeAsistenciaReal.toFixed(2),
                total_presentes_fisicos: totalPresentesReales,
                virtual: asistentesVirtual,
                presencial: asistentesPresencial,
                total_presentes: totalPresentesReales + totalPresentesGenericos,
                total_genericos_presentes: totalPresentesGenericos,
                poderes: totalPoderes
            };

            return NextResponse.json({ success: true, reportData: reporteUsuarios, stats, preguntasPendientes, preguntasRespondidas });
        }

        if (action === 'update_presence') {
            const { userId, estado } = body;
            await pool.query('UPDATE usuarios SET estado = ?, ultimo_login = NOW() WHERE id = ?', [estado, userId]);
            return NextResponse.json({ success: true });
        }

        if (action === 'update_config') {
            if (body.base) await pool.query('UPDATE configuracion SET quorum_base = ? WHERE id = 1', [body.base]);
            if (body.video !== undefined) await pool.query('UPDATE configuracion SET video_url = ? WHERE id = 1', [body.video]);

            if (body.google_form !== undefined) {
                try {
                    await pool.query('UPDATE configuracion SET google_form_url = ? WHERE id = 1', [body.google_form]);
                } catch (e) {
                    if (e.code === 'ER_BAD_FIELD_ERROR') {
                        await pool.query('ALTER TABLE configuracion ADD COLUMN google_form_url TEXT');
                        await pool.query('UPDATE configuracion SET google_form_url = ? WHERE id = 1', [body.google_form]);
                    } else { throw e; }
                }
            }

            if (body.enlace_auxiliar !== undefined) {
                try {
                    await pool.query('UPDATE configuracion SET enlace_auxiliar = ? WHERE id = 1', [body.enlace_auxiliar]);
                } catch (e) {
                    if (e.code === 'ER_BAD_FIELD_ERROR') {
                        await pool.query('ALTER TABLE configuracion ADD COLUMN enlace_auxiliar TEXT');
                        await pool.query('UPDATE configuracion SET enlace_auxiliar = ? WHERE id = 1', [body.enlace_auxiliar]);
                    } else { throw e; }
                }
            }

            // Guardar preferencia de controles de Youtube
            if (body.youtube_controls !== undefined) {
                try {
                    await pool.query('UPDATE configuracion SET youtube_controls = ? WHERE id = 1', [body.youtube_controls]);
                } catch (e) {
                    if (e.code === 'ER_BAD_FIELD_ERROR') {
                        await pool.query('ALTER TABLE configuracion ADD COLUMN youtube_controls TINYINT DEFAULT 1');
                        await pool.query('UPDATE configuracion SET youtube_controls = ? WHERE id = 1', [body.youtube_controls]);
                    } else { throw e; }
                }
            }

            // Guardar preferencia de Chat Privado
            if (body.chat_privado !== undefined) {
                try {
                    await pool.query('UPDATE configuracion SET chat_privado = ? WHERE id = 1', [body.chat_privado]);
                } catch (e) {
                    if (e.code === 'ER_BAD_FIELD_ERROR') {
                        await pool.query('ALTER TABLE configuracion ADD COLUMN chat_privado TINYINT DEFAULT 1');
                        await pool.query('UPDATE configuracion SET chat_privado = ? WHERE id = 1', [body.chat_privado]);
                    } else { throw e; }
                }
            }

            return NextResponse.json({ success: true });
        }

        if (action === 'create_poll') {
            const { pregunta, opciones, type, cargos } = body;
            const quorumInicio = await getCurrentQuorum(pool);
            const opcionesString = Array.isArray(opciones) ? opciones.join(',') : opciones;
            try { await pool.query('ALTER TABLE votaciones ADD COLUMN tipo VARCHAR(50) DEFAULT "unica"'); } catch (e) { }
            try { await pool.query('ALTER TABLE votaciones ADD COLUMN cargos INT DEFAULT 0'); } catch (e) { }

            const [res] = await pool.query(
                'INSERT INTO votaciones (pregunta, opciones, activa, fecha, quorum_inicio, tipo, cargos) VALUES (?, ?, ?, NOW(), ?, ?, ?)',
                [pregunta, opcionesString, 1, quorumInicio, type || 'unica', cargos || 0]
            );
            return NextResponse.json({ success: true, id: res.insertId });
        }

        if (action === 'close_poll') {
            const quorumFin = await getCurrentQuorum(pool);
            await pool.query(
                'UPDATE votaciones SET activa = 0, quorum_fin = ?, fecha_cierre = NOW() WHERE activa = 1',
                [quorumFin]
            );
            return NextResponse.json({ success: true });
        }

        if (action === 'project_poll') {
            try { await pool.query('ALTER TABLE votaciones ADD COLUMN proyectada TINYINT DEFAULT 0'); } catch (e) { }
            await pool.query('UPDATE votaciones SET proyectada = 0');
            await pool.query('UPDATE votaciones SET proyectada = 1 WHERE id = ?', [body.pollId]);
            return NextResponse.json({ success: true });
        }

        if (action === 'hide_projection') {
            try { await pool.query('ALTER TABLE votaciones ADD COLUMN proyectada TINYINT DEFAULT 0'); } catch (e) { }
            await pool.query('UPDATE votaciones SET proyectada = 0');
            return NextResponse.json({ success: true });
        }

        if (action === 'vote') {
            const { pollId, userId, respuesta } = body;
            const [existe] = await pool.query('SELECT id FROM votos WHERE votacion_id = ? AND usuario_id = ?', [pollId, userId]);
            if (existe.length > 0) return NextResponse.json({ error: 'Ya votaste' });
            const [miData] = await pool.query('SELECT coeficiente, id_representante, es_habilitado FROM usuarios WHERE id = ?', [userId]);
            if (miData.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' });
            if (miData[0].es_habilitado === 0) return NextResponse.json({ error: 'Usuario inhabilitado para votar.' });
            if (miData[0].id_representante) return NextResponse.json({ error: 'No tienes permiso para votar, has cedido tu poder.' });

            const [representados] = await pool.query(`SELECT nombre, nombre_empresa, coeficiente FROM usuarios WHERE id_representante = ?`, [userId]);

            let miCoeficiente = parseFloat(miData[0].coeficiente || 0);
            let poderAdicional = 0;
            let nombresRepresentados = [];

            representados.forEach(r => {
                poderAdicional += parseFloat(r.coeficiente || 0);
                nombresRepresentados.push(r.nombre_empresa || r.nombre);
            });

            const pesoTotalVoto = miCoeficiente + poderAdicional;
            const stringPoderes = nombresRepresentados.length > 0 ? nombresRepresentados.join(', ') : null;

            try { await pool.query('ALTER TABLE votos ADD COLUMN poderes_ejercidos TEXT NULL'); } catch (e) { }

            await pool.query('INSERT INTO votos (votacion_id, usuario_id, respuesta, coeficiente, poderes_ejercidos) VALUES (?, ?, ?, ?, ?)',
                [pollId, userId, respuesta, pesoTotalVoto, stringPoderes]);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Acción no válida' });

    } catch (error) {
        console.error("Error API Asamblea POST:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}