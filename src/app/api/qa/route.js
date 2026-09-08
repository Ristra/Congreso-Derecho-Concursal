import { NextResponse } from 'next/server';
import {pool} from '@/lib/db';

// Enviar preguntas a pantalla
export async function GET(){
    try{
        // Obtener preguntas por fecha (Mas Rec.)
        const [rows] = await pool.query('SELECT * FROM preguntas_qa ORDER BY fecha DESC');
        return NextResponse.json(rows);
    } catch (error) {
        console.error("Error obteniendo preguntas: ", error);
        return NextResponse.json({error: "Error al obtener las preguntas"},{status:500});
    }
}
// POST: Guadar pregunta nueva
export async function POST(request){
    try{
        const body = await request.json();
        const {autor, email, pregunta } = body;

        // Validar que no hay campos vacíos
        if (!autor || !pregunta){
            return NextResponse.json({error: "Autor y pregunta son obligatorios"}, {status:400});
        }

        const[estadoControl] = await pool.query('SELECT activa FROM control_asamblea ORDER BY id DESC LIMIT 1')

        if (!estadoControl || estadoControl.length === 0 || estadoControl[0].activa !== 1){
            return NextResponse.json({success: true, message: "No guardado: evento inactivo"});
        }

        // Insertar pregunta en la tabla
        const [result] = await pool.query(
            'INSERT INTO preguntas_qa (autor, email, pregunta) VALUES (?, ?, ?)',
            [autor, email || null, pregunta]
        );

        return NextResponse.json({ succes: true, id: result.insertId });
        
    } catch (error){
        console.error("Error creando pregunta:", error);
        return NextResponse.json({error: "Error al guardar tu pregunta"}, {status:500});
    }
}

// PUT: Actualizar estado (Admin marca: 'Respondida' - 'Descartada')
export async function PUT(request){
    try{
        const body = await request.json();
        const {id, estado} = body;

        if (!id || !estado){
            return NextResponse.json({error: "ID y estado son obligatorios"}, {status:400});
        }

        await pool.query(
            'UPDATE preguntas_qa SET estado = ? WHERE id = ?',
            [estado, id]
        );
        return NextResponse.json({ success: true });
    } catch (error){
        console.error("Error actualizando estado:", error);
        return NextResponse.json({ error: "Error al actualizar la pregunta"}, {status:500});
    }
}

export async function DELETE() {
  try {
    // Eliminamos todo el contenido de la tabla preguntas_qa
    const [result] = await pool.query("DELETE FROM preguntas_qa");

    /* Nota: Si prefieres que el contador de IDs vuelva a empezar desde 1, 
      puedes cambiar la línea anterior por:
      const [result] = await pool.query("TRUNCATE TABLE preguntas_qa");
      (Usa TRUNCATE solo si NO tienes problemas de llaves foráneas estrictas).
    */

    return NextResponse.json({ 
      success: true, 
      message: "Todas las preguntas han sido eliminadas correctamente." 
    }, { status: 200 });

  } catch (error) {
    console.error("Error al limpiar la tabla preguntas_qa:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Hubo un error al limpiar la bandeja de preguntas." 
    }, { status: 500 });
  }
}