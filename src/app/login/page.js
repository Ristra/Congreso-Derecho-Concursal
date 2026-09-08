'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ESTADO PARA EL BANNER DINÁMICO
  // Por ahora lo dejamos con una ruta local, pero luego aquí 
  // haremos un fetch para traer la URL desde tu base de datos.
  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await fetch('/login/banner');
        if (res.ok) {
          const data = await res.json();
          setBannerUrl(data.banner_url);
        }
      } catch (error) {
        console.error('Error cargando banner:', error);
      }
    };
    fetchBanner();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.clear();
        const perfilUsuario = data.usuario ? data.usuario : data;
        localStorage.setItem('usuario_asamblea', JSON.stringify(perfilUsuario))
        router.push('/');
      } else {
        setError(data.error || 'Error de credenciales');
        setLoading(false);
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-white overflow-hidden">

      {/* IZQUIERDA: BANNER ADMINISTRABLE */}
      {/* Añadimos pt-24 (padding-top) solo en móvil para esquivar el header absoluto */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-50 md:bg-white pt-24 pb-4 md:p-0 md:min-h-screen">
        {bannerUrl ? (
          <img 
            src={bannerUrl} 
            alt="Banner del evento" 
            className="w-full h-[30vh] md:h-auto md:w-auto md:max-h-[99vh] md:max-w-[99%] object-contain transition-all duration-500"
          />
        ) : (
          <div className="animate-pulse bg-gray-200 w-full h-[30vh] md:h-[85vh] md:w-[85%] rounded-xl"></div>
        )}
      </div>
      

      {/* DERECHA: FORMULARIO (Se mantiene intacto) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">

        {/* Header móvil */}
        <div className="lg:hidden absolute top-0 left-0 w-full p-5 bg-[#0d1e3d] text-white flex items-center gap-3">
          <img src="/logo-congreso.png" alt="Andesco" className="h-12 w-auto" />
        </div>

        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-5 mt-1 lg:mt-0">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Por favor ingresa tus credenciales de participante.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <div className="mt-2">
                <input
                  id="email" name="email" type="email"
                  autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#0d1e3d] focus:border-[#0d1e3d] sm:text-sm transition-all bg-gray-50 hover:bg-white"
                  placeholder="nombre@empresa.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-2">
                <input
                  id="password" name="password" type="password"
                  autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#0d1e3d] focus:border-[#0d1e3d] sm:text-sm transition-all bg-gray-50 hover:bg-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me" name="remember-me" type="checkbox"
                  className="h-4 w-4 text-[#0d1e3d] focus:ring-[#0d1e3d] border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Recordarme
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-[#0d1e3d] hover:text-[#cc1b1b] transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-sm font-bold text-white bg-[#0d1e3d] hover:bg-[#cc1b1b] transition-all duration-300 shadow-md ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}