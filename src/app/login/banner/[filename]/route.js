import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }){
    try {
        const resolvedParams = await params;
        const filename = resolvedParams.filename;
        
        const filePath = path.join(process.cwd(), 'public', 'banner', filename);

        if (!fs.existsSync(filePath)) {
            return new NextResponse('Imagen no encontrada', {status: 404});
        }

        const fileBuffer = fs.readFileSync(filePath);

        const ext = path.extname(filename).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.gif') mimeType = 'image/gif';
        if (ext === '.webp') mimeType = 'image/webp';
        if (ext === '.svg') mimeType = 'image/svg+xml';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error("Error leyendo imagen del banner:", error);
        return new NextResponse('Error interno', { status: 500});
    }
}