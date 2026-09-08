export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '@/lib/db';

export async function POST(request){
    try {
        const formData = await request.formData();
        const file = formData.get('banner');

        if (!file){
            return NextResponse.json({ error: 'No se envió ninguna imagen'  }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Crear nombre único para evitar caché
        const filename = `patrocinadores_${Date.now()}_${file.name.replaceAll(" ", "_")}`;

        // Guarda en la carpeta
        const uploadDir = path.join(process.cwd(), 'public', 'banner');
        const filePath = path.join(uploadDir, filename);

        await fs.writeFile(filePath, buffer);

        const bannerUrl = `/api/login/banner/${filename}`;

        await pool.query(
            'UPDATE configuracion SET banner_patrocinador_url = ? WHERE id = 1',
            [bannerUrl]
        );

        return NextResponse.json({ success: true, bannerUrl });
    } catch (error) {
        console.error('Error subiendo banner de patrocinadores', error);
        return NextResponse.json({ error: 'Error interno del servidor'}, { status: 500});
    }
}

export async function GET() {
    try {
        // Buscamos específicamente la columna con su nombre exacto
        const [rows] = await pool.query(
            'SELECT banner_patrocinador_url FROM configuracion WHERE id = 1'
        );
        
        // Verificamos usando el nombre en singular exacto
        if (rows.length > 0 && rows[0].banner_patrocinador_url) {
            return NextResponse.json({ url: rows[0].banner_patrocinador_url });
        }
        
        return NextResponse.json({ url: null });
    } catch (error) {
        console.error('Error obteniendo el banner:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}