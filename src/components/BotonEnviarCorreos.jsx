'use client';
import { useState, usestate } from 'react';

export default function BotonEnviarCorreos({ usuarios = [] }) {
    const [modalAbierto, setModalAbierto] = useState(false);
    const [estaEnviando, setEstaEnviando] = useState(false);
    const [progreso, setProgreso] = useState(0);

    const usuariosPendientes = usuarios?.length || 0;

    // Función que se ejecutará al confirmar en el modal
    const iniciarEnvioMasivo = async () => {
        setEstaEnviando(true);
        setProgreso(0);        

        const TAMAÑO_LOTE = 50;

        for (let i = 0; i < usuariosPendientes; i+= TAMAÑO_LOTE){
            const lote = usuarios.slice(i, i + TAMAÑO_LOTE);

            try {
                // Petición a la nueva API
                const respuesta = await fetch('api/enviar-credenciales', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({usuarios: lote}),
                });

                if (!respuesta.ok) {
                    console.error("Hubo un error al enviar el lote", await respuesta.json());
                }

                // Actualiza la barra de progreso (muestra la cantidad real procesada)
                const avanceReal = Math.min(i + TAMAÑO_LOTE, usuariosPendientes);
                setProgreso(avanceReal)

                // Pausa estrtégica para evitar bloque por 'Rate Limit'
                if (avanceReal < usuariosPendientes) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error("Error de red o servidor:", error);
            }
        }


        // Simulación: Contar del 0 a usuariosPendientes para ver la barra
       /* for (let i = 1; i <= usuariosPendientes; i++) {
            await new Promise((resolve) => setTimeout(resolve, 50)); // Simula el tiempo de la API
            setProgreso(i);
        }*/
        setEstaEnviando(false);
        setModalAbierto(false);
        alert('¡Envío de credenciales completado con éxito!');
    };

    return (
        <>
            {/* Botón Principal */}
            <button
                onClick={() => setModalAbierto(true)}
                disabled={usuariosPendientes === 0}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all text-sm whitespace-nowrap flex-1 lg:flex-none justify-center
                    ${usuariosPendientes === 0
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
                <svg xmlsn="https://www.w3.org/200/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Enviar Credenciales
            </button>

            {/* Fondo del Modal (Overlay) */}
            {modalAbierto && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-all"
                    onClick={() => setModalAbierto(false)}
                >
                    {/* Caja del modal */}
                    <div
                        className="bg-white rounded-lx shadow-2xl w-full max-w-md p-6 mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Confirmar Envío Masivo
                        </h3>

                        <p className="text-gray-600 mb-6">
                            ¿Estás seguro de enviar las credenciales de acceso a <strong>{usuariosPendientes}</strong> usuarios? Esta acción enviará correos reales y no se puede deshacer.
                        </p>

                        {/* Barra de Progreso */}
                        {estaEnviando ? (
                            <div className="mb-6">
                                <div className="flex justify-between text-sm text-gray-600 mb-1">
                                    <span>Enviando Correos...</span>
                                    <span className="font-semibold">{progreso} / {usuariosPendientes}</span>
                                </div>
                                <div className="w-full bd-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${(progreso / usuariosPendientes) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setModalAbierto(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={iniciarEnvioMasivo}
                                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 font-medium transition-colors shadow-sm"
                                >
                                    Sí, Enviar {usuariosPendientes} Correos
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}