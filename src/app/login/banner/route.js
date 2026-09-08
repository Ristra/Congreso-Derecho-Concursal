import { NextResponse } from 'next/server';
import { writeFile} from 'fs/promises';
import path from 'path';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// CONSULTA BANNER ACTUAL
export async function GET() {
    try {
        const [rows] = await pool.query('SELECT banner_url FROM configuracion WHERE id = 1');
        if (rows.length > 0 ){
            return NextResponse.json({banner_url: rows[0].banner_url });
        }
        return NextResponse.json({ banner_url: '/bannerNuevo.jpeg' }); // BANNER POR DEFECTO
    } catch (error){
        console.error('Error obteniendo banner:', error);
        return NextResponse.json({ error: 'Error al obtener configuración'}, { status:500 });
    }
}

// Recibe y guarda la imagen del nuevo banner
export async function POST(request) {
    try {
        const data = await request.formData();
        const file = data.get('banner');

        if (!file){
            return NextResponse.json({ error: 'No se envió ninguna imagen'}, { status: 400 });
        }
        // Convierte archivo a buffer para guardarlo
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Crea nombre único para evitar caché del navegador no muestre cambio
        const uniqueSuffix  = Date.now()
        const filename = `banner_${uniqueSuffix}${path.extname(file.name)}`;
        
        //  Guarda el archivo físicamente en la carpeta public/banner
        const filepath = path.join(process.cwd(), 'public', 'banner', filename);
        await writeFile(filepath, buffer);
        
        // Actualiza la ruta en la base de datos
        const finalUrl = `/login/banner/${filename}`;
        await pool.query('UPDATE configuracion SET banner_url = ? WHERE id = 1', [finalUrl]);

        return NextResponse.json({succes: true, banner_url: finalUrl});
    } catch (error) {
        console.error('Error subiendo banner:', error);
        return NextResponse.json({error: 'Error al procesar la imagen'}, { satus: 500 });
    }
}