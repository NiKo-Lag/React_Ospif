// src/app/portal/(main)/dashboard/page.jsx

import { ChartBarIcon, UserGroupIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

// Componente para las tarjetas de estadísticas
const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div className="bg-indigo-500 p-3 rounded-lg text-white">
            <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

export default function ProviderDashboardPage() {
    // En el futuro, estos datos vendrán de la API
    const stats = [
        { title: 'Autorizaciones Pendientes', value: '12', icon: DocumentCheckIcon },
        { title: 'Afiliados Verificados (Hoy)', value: '45', icon: UserGroupIcon },
        { title: 'Prácticas Realizadas (Mes)', value: '238', icon: ChartBarIcon },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-gray-600">Resumen de tu actividad reciente.</p>
            </div>

            {/* Tarjetas de Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* Placeholder para futuras secciones */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-gray-800">Últimas Notificaciones</h2>
                    <p className="mt-4 text-gray-500">Aún no hay notificaciones.</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-lg font-semibold text-gray-800">Accesos Rápidos</h2>
                    <ul className="mt-4 space-y-2">
                        <li><a href="/portal/verify-member" className="text-indigo-600 hover:underline">Verificar un nuevo afiliado</a></li>
                        <li><a href="/portal/my-authorizations" className="text-indigo-600 hover:underline">Ver mis autorizaciones</a></li>
                        <li><a href="/portal/denounce-internment" className="text-indigo-600 hover:underline">Denunciar una internación</a></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
