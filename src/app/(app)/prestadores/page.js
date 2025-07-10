'use client';

import { useState, useEffect } from 'react';

// Recibe la lista inicial de prestadores desde el Componente de Servidor
export default function PrestadoresClient({ initialProviders }) {
    // Estado para manejar la lista de prestadores (puede cambiar por el filtro)
    const [providers, setProviders] = useState(initialProviders);
    // Estado para el término de búsqueda
    const [searchTerm, setSearchTerm] = useState('');

    // KPIs para el resumen de prestadores
    const total = initialProviders.length;
    const active = initialProviders.filter(p => p.estado === 'activo').length;
    const inactive = total - active;

    // Este efecto se ejecuta cada vez que el término de búsqueda cambia
    useEffect(() => {
        const filtered = initialProviders.filter(p => 
            p.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.cuit.includes(searchTerm)
        );
        setProviders(filtered);
    }, [searchTerm, initialProviders]);

    const handleAddProvider = () => {
        // Lógica para el modal de "Agregar Prestador" (la haremos en el siguiente paso)
        alert('Funcionalidad de Agregar/Editar se implementará a continuación.');
    };

    return (
        <div>
            {/* Header y Buscador */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full md:w-1/3">
                    <input 
                        type="text" 
                        id="search-input" 
                        placeholder="Buscar por Razón Social o CUIT..." 
                        className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-3 gap-6 text-center bg-white p-4 rounded-lg shadow-sm border">
                    <div>
                        <p className="text-2xl font-bold text-gray-800">{total}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-600">{active}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Activos</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-600">{inactive}</p>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Inactivos</p>
                    </div>
                </div>
            </div>

            {/* Tabla de Prestadores */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Listado de Prestadores</h2>
                    <button 
                        onClick={handleAddProvider}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm"
                    >
                        + Agregar Prestador
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Razón Social</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CUIT</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sedes</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {providers.map(provider => (
                                <tr key={provider.id}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-indigo-600">{provider.razonSocial}</div>
                                        <div className="text-xs text-gray-500">{provider.nombreFantasia || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{provider.cuit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-bold">{JSON.parse(provider.history || '[]').length > 0 ? JSON.parse(provider.history)[0].details.data.sedes.length : 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${provider.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {provider.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                        <button className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                        <button className="text-red-600 hover:text-red-900">Baja</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
