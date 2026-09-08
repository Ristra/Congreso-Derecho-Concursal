'use client';
import { useState, useRef, useEffect } from 'react';

export default function QAPanel({ usuario, isAdmin, data }) {
    const [preguntas, setPreguntas] = useState([]);
    const [nuevaPregunta, setNuevaPregunta] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 1. REFERENCIAS Y ESTADOS DEL SCROLL
    const scrollRef = useRef(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [hasNewQuestions, setHasNewQuestions] = useState(false);
    const [prevCount, setPrevCount] = useState(0);

    // 2. Función obtiene preguntas de la API
    const fetchPreguntas = async () => {
        try {
            const res = await fetch('/api/qa');
            if (res.ok) {
                const data = await res.json();
                setPreguntas(data);
            }
        } catch (error) {
            console.error("Error obteniendo preguntas:", error);
        }
    };

    // 3. Carga preguntas al inicio y actualiza cada 5 seg.
    useEffect(() => {
        fetchPreguntas();
        const interval = setInterval(fetchPreguntas, 5000);
        return () => clearInterval(interval);
    }, []);

    // 4. Envía nueva pregunta
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!nuevaPregunta.trim() || !usuario) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                    autor: usuario.nombre || usuario.nombre_empresa || 'Participante',
                    email: usuario.email || null,
                    pregunta: nuevaPregunta
                })
            });
            if (res.ok) {
                setNuevaPregunta('');
                fetchPreguntas();
            }
        } catch (error) {
            console.error("Error enviando pregunta:", error);
        }
        setIsSubmitting(false);
    };

    // 5. Función admin para marcar preguntas
    const actualizarEstado = async (id, nuevoEstado) => {
        try {
            await fetch('/api/qa', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, estado: nuevoEstado })
            });
            fetchPreguntas();
        } catch (error) {
            console.error("Error actualizando estado:", error);
        }
    };

    // 6. Lógica del Scroll
    const handleScroll = (e) => {
        const { scrollTop } = e.target;
        setIsScrolled(scrollTop > 50);

        if (scrollTop <= 10) setHasNewQuestions(false);
    };

    const scrollToTop = () => {
        if (scrollRef.current) {
            try {
                scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (error) {
                scrollRef.current.scrollTop = 0;
            }
        }
        setHasNewQuestions(false);
    };

    // 7. Efecto para saber si llegaron preguntas mientras leías abajo
    useEffect(() => {
        if (preguntas.length > prevCount) {
            if (isScrolled) {
                setHasNewQuestions(true);
            }
        }
        setPrevCount(preguntas.length);
    }, [preguntas, isScrolled]);

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col h-full border-t-4 border-orange-500">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                💬 Realice su pregunta aquí.
            </h3>

            {/* --- ÁREA DE MENSAJES (Estructura corregida) --- */}
            <div className="relative h-[350px] mb-4"> 

                {/* BOTÓN FLOTANTE */}
                {hasNewQuestions && (
                    <button
                        onClick={scrollToTop}
                        className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-bounce hover:bg-blue-700 transition"
                    >
                        ⬆️ Nuevas preguntas
                    </button>
                )}

                {/* CAJA SCROLLABLE ÚNICA */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto space-y-3 pr-2 h-full border border-gray-100 rounded-lg p-2 bg-gray-50/50 custom-scrollbar"
                >
                    {preguntas.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-70">
                            <span className="text-4xl mb-2">🤔</span>
                            <p className="text-sm italic text-center">Aún no hay preguntas.<br />¡Sé el primero en participar!</p>
                        </div>
                    ) : (
                        preguntas
                            .filter(q => {
                                // Admin siempre ve las preguntas
                                if (isAdmin) return true;

                                // Usuarios no ven las 'preguntas descartadas'
                                if (q.estado === 'descartada') return false;

                                // Filtro de privacidad si chat es privado '1', el usuario ve sus propios comentarios
                                if (data?.chatPrivado === 1){
                                    return (
                                        q.autor === usuario?.nombre ||
                                        q.autor === usuario?.nombre_empresa
                                    );
                                }

                                // Si es público '0', usuario ve todas las respondidas/pendientes
                                return true;

                            })
                            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                            .map((q) => (
                                <div key={q.id} className={`p-3 rounded-lg border transition-colors ${q.estado === 'respondida' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-semibold text-sm text-gray-700">{q.autor}</span>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {new Date(q.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-sm ${q.estado === 'respondida' ? 'text-gray-500' : 'text-gray-800'}`}>
                                        {q.pregunta}
                                    </p>

                                    {/* Controles solo para Administradores */}
                                    {isAdmin && (
                                        <div className="mt-3 flex gap-2 justify-end border-t border-gray-100 pt-2">
                                            {q.estado !== 'respondida' && (
                                                <button onClick={() => actualizarEstado(q.id, 'respondida')} className="text-[11px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition">
                                                    ✓ Respondida
                                                </button>
                                            )}
                                            {q.estado !== 'descartada' && (
                                                <button onClick={() => actualizarEstado(q.id, 'descartada')} className="text-[11px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition">
                                                    ✕ Ocultar
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                    )}
                </div>
            </div>

            {/* --- Input de Envío --- */}
            <form onSubmit={handleSubmit} className="flex gap-2 mt-auto">
                <input
                    type="text"
                    placeholder="Escribe tu duda a los conferencistas..."
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-shadow bg-gray-50 focus:bg-white"
                    value={nuevaPregunta}
                    onChange={(e) => setNuevaPregunta(e.target.value)}
                    disabled={isSubmitting}
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !nuevaPregunta.trim()}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
}