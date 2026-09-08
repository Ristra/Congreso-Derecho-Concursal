import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// GET: Obtener todos los puntos ordenados por POSICIÓN
export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM orden_dia ORDER BY posicion ASC, id ASC');
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Crear un nuevo punto (al final de la lista)
export async function POST(request) {
  try {
    const { descripcion } = await request.json();
    
    // 1. Obtener la última posición para agregar al final
    const [maxPos] = await pool.query('SELECT MAX(posicion) as max FROM orden_dia');
    const nextPos = (maxPos[0].max || 0) + 1;

    await pool.query('INSERT INTO orden_dia (descripcion, posicion) VALUES (?, ?)', [descripcion, nextPos]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Maneja dos acciones: Marcar completado Y Reordenar
export async function PUT(request) {
  try {
    const body = await request.json();

    // ACCIÓN 1: Reordenar lista completa
    if (body.action === 'reorder') {
        const { items } = body; // Array de IDs en el nuevo orden
        
        // Actualizamos cada ítem con su nueva posición (en un bucle o transacción)
        // Nota: Para producción masiva se usa CASE WHEN, pero para listas cortas un loop está bien.
        for (let i = 0; i < items.length; i++) {
            await pool.query('UPDATE orden_dia SET posicion = ? WHERE id = ?', [i, items[i].id]);
        }
        return NextResponse.json({ success: true });
    }

    // ACCIÓN 2: Toggle completado (Lógica original)
    const { id, completado } = body;
    if (id) {
        await pool.query('UPDATE orden_dia SET completado = ? WHERE id = ?', [completado, id]);
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Datos insuficientes' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Borrar un punto
export async function DELETE(request) {
  try {
    const { id } = await request.json();
    await pool.query('DELETE FROM orden_dia WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}