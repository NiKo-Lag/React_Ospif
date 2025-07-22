"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChartBarIcon, UserGroupIcon, DocumentCheckIcon, InformationCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// src/app/portal/(main)/dashboard/page.jsx

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

// =====================================================================
// COMPONENTE CountdownTimer CORREGIDO
// =====================================================================
const CountdownTimer = ({ deadline }) => {
    const calculateTimeLeft = useCallback(() => {
        const difference = +new Date(deadline) - +new Date();
        let timeLeft = {};
        let isPast = false;

        if (difference > 0) {
            timeLeft = {
                días: Math.floor(difference / (1000 * 60 * 60 * 24)),
                horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutos: Math.floor((difference / 1000 / 60) % 60),
                segundos: Math.floor((difference / 1000) % 60),
            };
        } else {
            isPast = true;
            const pastDifference = Math.abs(difference);
            timeLeft = {
                días: Math.floor(pastDifference / (1000 * 60 * 60 * 24)),
                horas: Math.floor((pastDifference / (1000 * 60 * 60)) % 24),
            };
        }
        return { timeLeft, isPast };
    }, [deadline]);

    const [{ timeLeft, isPast }, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        // Usamos setInterval para que el temporizador se actualice cada segundo.
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Se limpia el intervalo cuando el componente se desmonta.
        return () => clearInterval(timer);
    }, [calculateTimeLeft]);

    if (isPast) {
        return (
            <div className="text-center text-red-600">
                <p className="font-bold">Plazo Vencido</p>
                <p className="text-sm">Hace {timeLeft.días || 0}d {timeLeft.horas || 0}h</p>
            </div>
        );
    }

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
        if (value > 0 || (interval === 'días' && timeLeft['días'] === 0 && Object.keys(timeLeft).length > 1) ) {
            return (
                <div key={interval} className="text-center">
                    <span className="text-xl lg:text-2xl font-bold text-gray-800">{String(value).padStart(2, '0')}</span>
                    <span className="block text-xs text-gray-500 uppercase">{interval}</span>
                </div>
            );
        }
        return null;
    });

    return (
        <div className="flex space-x-4">
            {timerComponents}
        </div>
    );
};

// =====================================================================
// COMPONENTE PendingActionsPanel CON MÁS DATOS
// =====================================================================
const PendingActionsPanel = ({ internments, onActionClick }) => {
    const pendingInternments = useMemo(() => 
        // Restaurando el filtro original y correcto.
        internments.filter(i => i.requestType === 'internment' && i.status === 'INICIADA' && i.deadline),
        [internments]
    );

    if (pendingInternments.length === 0) {
        // No mostrar nada si no hay internaciones pendientes.
        return null;
    }

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-md">
            <div className="flex items-center mb-4">
                <InformationCircleIcon className="w-6 h-6 text-indigo-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-800">Internaciones que requieren atención</h2>
            </div>
            <div className="space-y-4">
                {pendingInternments.map(internment => (
                    <div key={internment.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-50 rounded-md">
                        <div className="md:col-span-1">
                            <p className="font-semibold text-gray-900">{internment.beneficiary}</p>
                            <p className="text-sm text-gray-500">CUIL: {internment.beneficiary_cuil}</p>
                            <p className="text-sm text-gray-500">F. Ingreso: {internment.date}</p>
                            <p className="text-sm text-gray-500">Límite: {new Date(internment.deadline).toLocaleString('es-AR')}</p>
                        </div>
                        <div className="md:col-span-1 flex justify-center">
                           <CountdownTimer deadline={internment.deadline} />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                            <button 
                                onClick={() => onActionClick(internment.id)}
                                className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                            >
                                Solicitar Prórroga
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function ProviderDashboardPage() {
    const [dashboardData, setDashboardData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/dashboard');
                if (!response.ok) throw new Error('No se pudieron cargar los datos del dashboard.');
                const data = await response.json();
                setDashboardData(data);
            } catch (err) {
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

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

            {/* Secciones de Notificaciones y Accesos Rápidos */}
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

            {/* ===> SECCIÓN MOVIDA AL FINAL <=== */}
            {loading ? (
                <p className="text-gray-500">Cargando internaciones que requieren atención...</p>
            ) : (
                <PendingActionsPanel 
                    internments={dashboardData} 
                    onActionClick={(id) => toast.error(`Acción para ${id} no implementada aquí.`)} 
                />
            )}
        </div>
    );
}
