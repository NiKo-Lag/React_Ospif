// src/components/internaciones/InternmentDetailModal.jsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon, CalendarIcon, UserIcon, BuildingOffice2Icon, ClipboardDocumentIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Helper para calcular días hábiles
const calculateBusinessDays = (startDate, endDate) => {
    let start = new Date(startDate.getTime());
    let end = new Date(endDate.getTime());
    let count = 0;
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    while (start <= end) {
        const dayOfWeek = start.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Domingo, 6 = Sábado
            count++;
        }
        start.setDate(start.getDate() + 1);
    }
    return count;
};

const DetailField = ({ icon: Icon, label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 flex items-center">
            <Icon className="w-5 h-5 mr-2 text-gray-400" />
            <span>{label}</span>
        </dt>
        <dd className="mt-1 text-sm text-gray-900 pl-7">{value || '-'}</dd>
    </div>
);

// --- 1. Se recibe la nueva prop 'onOpenProrroga' ---
export default function InternmentDetailModal({ request, onClose, onAttachPractice, onOpenProrroga }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (request?.id) {
            const fetchDetails = async () => {
                setLoading(true);
                setError('');
                try {
                    const response = await fetch(`/api/internment/${request.id}`);
                    if (!response.ok) {
                        throw new Error('No se pudieron cargar los detalles de la internación.');
                    }
                    const data = await response.json();
                    setDetails(data);
                } catch (err) {
                    setError(err.message);
                    toast.error(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        }
    }, [request?.id]);

    const dayCounts = useMemo(() => {
        if (!details?.admission_datetime) return { total: '-', business: '-' };
        
        const admission = new Date(details.admission_datetime);
        admission.setHours(0, 0, 0, 0);
        
        const discharge = details.egreso_date ? new Date(details.egreso_date) : new Date();
        discharge.setHours(0, 0, 0, 0);
        
        const totalDays = Math.round((discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const businessDays = calculateBusinessDays(admission, discharge);
        const labelSuffix = details.egreso_date ? 'totales' : 'transcurridos';

        return {
            total: `${totalDays} días ${labelSuffix}`,
            business: `${businessDays} días hábiles ${labelSuffix}`
        };
    }, [details]);

    if (!request) return null;

    return (
        <div className="flex flex-col h-full bg-gray-50 max-h-[90vh]">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
                <h2 className="text-xl font-semibold text-gray-800">Detalle de Internación: #{request.id}</h2>
                <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                {loading && <p className="text-center text-gray-500">Cargando detalles...</p>}
                {error && <p className="text-center text-red-500">Error: {error}</p>}
                {details && (
                    <>
                        <div className="p-4 border rounded-lg bg-white">
                            <h3 className="font-semibold text-lg mb-4 text-gray-800">Información General</h3>
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                <DetailField icon={UserIcon} label="Beneficiario" value={details.beneficiary_name} />
                                <DetailField icon={CalendarIcon} label="Fecha de Ingreso" value={new Date(details.admission_datetime).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} />
                                <DetailField icon={BuildingOffice2Icon} label="Prestador Notificador" value={request.provider_name} />
                                <DetailField icon={ClipboardDocumentIcon} label="Motivo de Ingreso" value={details.admission_reason} />
                                <DetailField icon={ClockIcon} label="Días de Internación" value={dayCounts.total} />
                                <DetailField icon={ClockIcon} label="Días Hábiles de Internación" value={dayCounts.business} />
                            </dl>
                        </div>

                        <div className="p-4 border rounded-lg bg-white">
                             <h3 className="font-semibold text-lg mb-3 text-gray-800">Prácticas Asociadas</h3>
                             {details.practices && details.practices.length > 0 ? (
                                 <ul className="divide-y divide-gray-200">
                                     {details.practices.map(practice => (
                                         <li key={practice.id} className="py-3 flex justify-between items-center">
                                             <div>
                                                <p className="text-sm font-medium text-gray-900">{practice.title}</p>
                                                <p className="text-xs text-gray-500">Solicitada el: {new Date(practice.created_at).toLocaleDateString('es-ES')}</p>
                                             </div>
                                             <span className="text-sm font-semibold text-gray-600">{practice.status}</span>
                                         </li>
                                     ))}
                                 </ul>
                             ) : (
                                <p className="text-sm text-gray-500">No hay prácticas asociadas a esta internación.</p>
                             )}
                        </div>

                         <div className="p-4 border rounded-lg bg-white">
                             <h3 className="font-semibold text-lg mb-3 text-gray-800">Historial de Prórrogas</h3>
                             <p className="text-sm text-gray-500">No hay prórrogas registradas.</p>
                        </div>
                    </>
                )}
            </div>

            <div className="flex-shrink-0 p-4 border-t flex justify-between items-center bg-gray-100 rounded-b-lg">
                <div>
                    <button onClick={() => onAttachPractice(request)} className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors mr-2">Adjuntar Práctica</button>
                    {/* --- 2. El botón ahora llama a la función con el ID de la internación --- */}
                    <button 
                        onClick={() => onOpenProrroga(request.id)}
                        className="bg-yellow-100 text-yellow-700 font-semibold py-2 px-4 rounded-lg hover:bg-yellow-200 transition-colors"
                    >
                        Solicitar Prórroga
                    </button>
                </div>
                <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">
                    Cerrar
                </button>
            </div>
        </div>
    );
}
