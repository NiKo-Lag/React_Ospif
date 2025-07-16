// src/app/portal/login/page.jsx

"use client";

import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function ProviderLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Ingresando...');

        try {
            const response = await fetch('/api/portal/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error en el inicio de sesión');
            }

            toast.success('¡Inicio de sesión exitoso! Redirigiendo...', { id: toastId });
            
            setTimeout(() => {
                window.location.href = '/portal/dashboard'; 
            }, 1500);

        } catch (error) {
            toast.error(error.message, { id: toastId });
            setLoading(false);
        }
    };

    return (
        <>
            {/* --- Estilos para las animaciones --- */}
            <style jsx global>{`
                body {
                    font-family: 'Inter', sans-serif;
                }
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    opacity: 0;
                    animation: fadeInUp 0.7s ease-out forwards;
                }
            `}</style>
            
            <Toaster position="top-center" />
            <div className="min-h-screen flex flex-col md:flex-row">

                {/* Columna Izquierda: Visual y Branding */}
                <div className="relative hidden lg:flex w-full md:w-1/2 items-center justify-center p-12 bg-gradient-to-br from-gray-800 to-gray-900 text-white overflow-hidden">
                    <div className="absolute top-8 left-8 z-10">
                        <img src="https://www.ospif.ar/resc/logo_redondo.png" alt="Logo OSPIF" className="h-16 w-auto animate-fade-in-up" style={{ animationDelay: '100ms' }} />
                    </div>
                    <div className="relative z-10 text-center space-y-4">
                        <h1 className="text-3xl font-bold tracking-tight animate-fade-in-up max-w-xl" style={{ animationDelay: '300ms' }}>
                            PORTAL DE PRESTADORES DE LA OBRA SOCIAL DEL PERSONAL DE LA INDUSTRIA DEL FÓSFORO
                        </h1>
                        <p className="text-gray-300 animate-fade-in-up" style={{ animationDelay: '500ms' }}>Rnas 108100</p>
                    </div>
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full mix-blend-lighten filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '0s' }}></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-pink-500 to-yellow-400 rounded-full mix-blend-lighten filter blur-3xl opacity-20 animate-blob" style={{ animationDelay: '2s' }}></div>
                </div>

                {/* Columna Derecha: Formulario de Login */}
                <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
                    <div className="max-w-md w-full space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Iniciar Sesión</h2>
                            <p className="mt-2 text-gray-600">Ingresá tus credenciales para continuar.</p>
                        </div>

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo Electrónico</label>
                                <div className="mt-1">
                                    <input id="email" name="email" type="email" autoComplete="email" required
                                        placeholder="tu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out" />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="password" className="text-sm font-medium text-gray-700">Contraseña</label>
                                    <a href="#" onClick={(e) => {e.preventDefault(); toast.error('Función no implementada.')}} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">¿Olvidaste tu contraseña?</a>
                                </div>
                                <div className="mt-1">
                                    <input id="password" name="password" type="password" autoComplete="current-password" required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out" />
                                </div>
                            </div>

                            <div>
                                <button type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 disabled:bg-indigo-400">
                                    {loading ? 'Ingresando...' : 'Ingresar'}
                                    {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>}
                                </button>
                            </div>
                        </form>

                        <p className="text-center text-sm text-gray-500">
                            ¿No tenés una cuenta? Ponete en contacto con <a href="#" onClick={(e) => {e.preventDefault(); toast.error('Función no implementada.')}} className="font-medium text-indigo-600 hover:text-indigo-500">soporte</a>.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
