'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Asegúrate de que esta línea NO diga "async function"
export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                router.push('/'); 
            } else {
                setError(data.message || 'Error al iniciar sesión.');
            }
        } catch (err) {
            setError('No se pudo conectar con el servidor.');
        }
    };

    return (
        <div className="bg-gray-100 flex items-center justify-center h-screen">
            <div className="w-full max-w-sm">
                <form onSubmit={handleLogin} className="bg-white shadow-lg rounded-xl px-8 pt-6 pb-8 mb-4">
                    <div className="mb-6 text-center">
                        <img 
                            src="https://www.ospif.ar/resc/logo_redondo.png" 
                            alt="Logo OSPIF" 
                            className="mx-auto mb-3 h-20 w-auto object-contain"
                        />
                        <h1 className="text-2xl font-bold text-gray-800">Acceso al Sistema</h1>
                        <p className="text-gray-500 text-sm mt-1">Gestión de Obra Social</p>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Usuario
                        </label>
                        <input 
                            className="shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                            id="username" 
                            type="text" 
                            placeholder="Usuario" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Contraseña
                        </label>
                        <input 
                            className="shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                            id="password" 
                            type="password" 
                            placeholder="******************" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>
                    
                    {error && <div className="text-red-500 text-xs italic mb-4 text-center">{error}</div>}

                    <div className="flex items-center justify-center">
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline w-full" type="submit">
                            Ingresar
                        </button>
                    </div>
                </form>
                <p className="text-center text-gray-500 text-xs">
                    &copy;{new Date().getFullYear()} OSPIF. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
