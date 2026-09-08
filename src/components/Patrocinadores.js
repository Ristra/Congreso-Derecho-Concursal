"use client";
import { useState, useEffect } from 'react';

export default function Patrocinadores() {
    const [bannerUrl, setBannerUrl] = useState(null);
    const [cargando, setCargando] = useState(true); // Nuevo estado para saber si está pensando

    useEffect(() => {
        const cargarBanner = async () => {
    try {
        const res = await fetch('/api/bannerPatrocinador', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (data.url) {
                // 1. Extraemos solo el nombre del archivo (todo lo que está después del último /)
                const nombreArchivo = data.url.split('/').pop();
                
                // 2. Apuntamos al túnel que SÍ EXISTE y SÍ SABE LEER: /api/banner/
                setBannerUrl(`/login/banner/${nombreArchivo}?t=${new Date().getTime()}`);
            }
        }
    } catch (error) {
        console.error("Error al cargar:", error);
    } finally {
        setCargando(false);
    }
};

        cargarBanner();
    }, []);

    // Si está cargando, mostramos un pequeño texto
    if (cargando) {
        return (
            <div className="w-full h-32 bg-gray-50 flex items-center justify-center rounded-xl border border-gray-200">
                <p className="text-gray-400 text-sm">Cargando patrocinadores...</p>
            </div>
        );
    }

    // Si terminó de cargar y no hay imagen, mostramos un mensaje para el admin
    if (!bannerUrl) {
        const partes = data.url.split('/');
        const nombreArchivo = partes[partes.length - 1]; // Obtenemos el nombre final (ej: patrocinadores_...png)

        // Ahora apuntamos al túnel que ya creamos para leer archivos de esa carpeta
        // Asumiendo que tu túnel está en /api/banner/[filename]
        setBannerUrl(`/login/banner/${nombreArchivo}?t=${new Date().getTime()}`);
        
    }

    const listaDeLogos = [bannerUrl, bannerUrl, bannerUrl, bannerUrl];

    return (
        <div className="w-full bg-white py-0 overflow-hidden rounded-xl border border-gray-200 shadow-md ring-1 ring-black/5">
            <div className="flex overflow-hidden relative">
                <div className="animate-marquee flex items-center grayscale hover:grayscale-0 transition-all duration-500">
                    {listaDeLogos.map((logo, index) => (
                        <div key={index} className="flex-shrink-0 w-[80vw] md:w-[900px] h-32 flex items-center justify-center">
                            <img
                                src={logo}
                                alt="Patrocinadores"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}