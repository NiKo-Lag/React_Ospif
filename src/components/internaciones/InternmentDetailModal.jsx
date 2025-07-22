// src/components/internaciones/InternmentDetailModal.jsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { XMarkIcon, CalendarIcon, UserIcon, BuildingOffice2Icon, ClipboardDocumentIcon, ClockIcon, PrinterIcon, PlusCircleIcon } from '@heroicons/react/24/outline'; // Añadir PlusCircleIcon
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal'; // RUTA CORREGIDA
import BudgetRequestForm from './BudgetRequestForm'; // Importar el formulario de presupuesto
import Timeline from './Timeline';
import { calculateBusinessDays } from '@/lib/date-utils';
import ProrrogaDetailModal from './ProrrogaDetailModal'; // Importar el modal de detalle de prórroga
import AuthorizationForm from '@/components/autorizaciones/AuthorizationForm'; // Importar el formulario de autorización
import BudgetDetailModal from './BudgetDetailModal'; // Importar el nuevo modal de detalle de presupuesto
import { PaperAirplaneIcon, ReplyIcon } from '@heroicons/react/24/solid';

const DetailField = ({ icon: Icon, label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 flex items-center">
            <Icon className="w-5 h-5 mr-2 text-gray-400" />
            <span>{label}</span>
        </dt>
        <dd className="mt-1 text-sm text-gray-900 pl-7">{value || '-'}</dd>
    </div>
);

// Nuevo componente para los botones de acción en las secciones
const ActionButton = ({ onClick, children, icon: Icon, disabled }) => (
    <button
        onClick={onClick}
        className="flex items-center space-x-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
        disabled={disabled}
    >
        <Icon className="w-5 h-5" />
        <span>{children}</span>
    </button>
);

// Nuevo componente para la insignia de estado
const StatusBadge = ({ status }) => {
    const statusStyles = {
        INICIADA: 'bg-blue-100 text-blue-800',
        ACTIVA: 'bg-green-100 text-green-800',
        OBSERVADA: 'bg-yellow-100 text-yellow-800',
        INACTIVA: 'bg-gray-100 text-gray-800',
        FINALIZADA: 'bg-red-100 text-red-800',
        default: 'bg-gray-100 text-gray-800',
    };
    const style = statusStyles[status] || statusStyles.default;
    return <span className={`px-3 py-1 text-sm font-semibold rounded-full ${style}`}>{status}</span>;
};


// =====================================================================
// NUEVO COMPONENTE: ObservationsChat
// =====================================================================
const ObservationsChat = ({ internmentId, initialObservations = [] }) => {
    const { data: session } = useSession();
    const [observations, setObservations] = useState(initialObservations);
    const [newMessage, setNewMessage] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !session) return;
        setIsLoading(true);

        try {
            const response = await fetch(`/api/portal/internments/${internmentId}/add-observation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newMessage, replyTo: replyTo?.id }),
            });

            if (!response.ok) {
                throw new Error('No se pudo enviar la observación.');
            }
            const updatedObservations = await response.json();
            setObservations(updatedObservations);
            setNewMessage('');
            setReplyTo(null);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const findOriginalMessage = (replyToId) => {
        return observations.find(obs => obs.id === replyToId);
    };

    return (
        <section className="p-4 border rounded-lg bg-white">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">Observaciones</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {observations.map((obs) => {
                    const originalMessage = obs.replyTo ? findOriginalMessage(obs.replyTo) : null;
                    const isOwnMessage = obs.author.id === session?.user?.id;
                    return (
                        <div key={obs.id} className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                            <img src={obs.author.image || `https://ui-avatars.com/api/?name=${obs.author.name}&background=random`} alt={obs.author.name} className="w-10 h-10 rounded-full" />
                            <div className={`p-3 rounded-lg max-w-lg ${isOwnMessage ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm">{obs.author.name}</p>
                                    <p className={`text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'}`}>{new Date(obs.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                {originalMessage && (
                                    <div className="mt-1 p-2 border-l-2 border-gray-300 bg-black bg-opacity-10 rounded-md text-xs">
                                        <p className="font-semibold">{originalMessage.author.name}</p>
                                        <p className="opacity-80 truncate">{originalMessage.message}</p>
                                    </div>
                                )}
                                <p className="mt-1">{obs.message}</p>
                                {!isOwnMessage && (
                                    <button onClick={() => setReplyTo(obs)} className={`mt-1 text-xs font-semibold flex items-center gap-1 ${isOwnMessage ? 'text-indigo-200 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                                        <ReplyIcon className="w-3 h-3"/>
                                        Responder
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                 {observations.length === 0 && <p className="text-sm text-gray-500 text-center">No hay observaciones aún.</p>}
            </div>
            <div className="mt-4">
                {replyTo && (
                    <div className="p-2 bg-gray-100 rounded-t-lg text-sm text-gray-600 flex justify-between items-center">
                        <span>Respondiendo a: <span className="font-semibold">{replyTo.author.name}</span></span>
                        <button onClick={() => setReplyTo(null)} className="font-bold text-red-500 px-2">X</button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe una observación..."
                        className="flex-grow p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        disabled={isLoading}
                    />
                    <button type="submit" className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:bg-gray-400" disabled={isLoading}>
                        <PaperAirplaneIcon className="w-5 h-5"/>
                    </button>
                </form>
            </div>
        </section>
    );
};


// --- 1. Se recibe la nueva prop 'onOpenProrroga' ---
export default function InternmentDetailModal({ request, onClose, onAttachPractice, onOpenProrroga, userRole }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [selectedProrroga, setSelectedProrroga] = useState(null);
    const [selectedPractice, setSelectedPractice] = useState(null);
    const [selectedBudget, setSelectedBudget] = useState(null);

    useEffect(() => {
        if (request?.id) {
            const fetchDetails = async () => {
                setLoading(true);
                setError('');
                try {
                    // Determina el endpoint basado en el rol del usuario
                    const apiEndpoint = userRole === 'auditor'
                        ? `/api/auditor/internments/${request.id}`
                        : `/api/portal/internments/${request.id}`;

                    const response = await fetch(apiEndpoint);
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

    const timelineEvents = useMemo(() => {
        if (!details) return [];

        const events = [];

        // Evento de creación
        events.push({
            date: details.admission_datetime,
            description: 'Se inició la denuncia de internación.'
        });

        // Eventos de prórrogas
        if (details.details?.extension_requests) {
            details.details.extension_requests.forEach((ext) => {
                events.push({
                    date: ext.requested_at,         // CORRECCIÓN FINAL
                    description: `Se solicitó prórroga de ${ext.requested_days} días.` // CORRECCIÓN FINAL
                });
            });
        }
        
        // Evento de finalización
        if (details.status === 'Finalizada' && details.egreso_date) {
             events.push({
                date: details.egreso_date,
                description: 'La internación ha finalizado.'
             });
        }

        return events;
    }, [details]);
    
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

    const handleOpenBudgetModal = () => {
        setIsBudgetModalOpen(true);
    };

    const handleCloseBudgetModal = () => {
        setIsBudgetModalOpen(false);
    };

    const handleBudgetSuccess = () => {
        handleCloseBudgetModal();
        // Opcional: Recargar detalles o mostrar un toast global
        toast.success('El presupuesto ha sido enviado exitosamente.');
        // podrías querer refrescar la data aquí si es necesario
    };

    // Extraer los presupuestos del objeto de detalles para facilitar su uso
    const budgetRequests = useMemo(() => {
        return details?.details?.events?.filter(event => event.type === 'budget_request') || [];
    }, [details]);

    // Lógica para deshabilitar botones
    const isActionDisabled = useMemo(() => {
        if (!details) return true;
        return ['INACTIVA', 'FINALIZADA'].includes(details.status);
    }, [details]);
    
    const allowUploadOnly = useMemo(() => {
         if (!details) return false;
         return details.status === 'INACTIVA';
    }, [details]);


    if (!request) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75">
                <div className="w-full max-w-7xl h-[95vh] flex flex-col bg-gray-50 rounded-xl shadow-2xl">
                    <header className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-white rounded-t-xl">
                        <div className="flex items-center space-x-4">
                           <h2 className="text-xl font-semibold text-gray-800">Detalle de Internación: #{request.id}</h2>
                           {details && <StatusBadge status={details.status} />}
                        </div>
                        <div className="flex items-center space-x-2">
                            <button type="button" onClick={() => toast.error('Función de impresión no implementada.')} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                                <PrinterIcon className="h-6 w-6" />
                            </button>
                            <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </header>

                    <div className="flex-grow flex overflow-hidden">
                        {/* Columna izquierda para la documentación */}
                        <aside className="w-80 bg-white border-r p-4 overflow-y-auto flex-shrink-0">
                            <h3 className="font-semibold text-lg mb-3 text-gray-800 px-2">Documentación Adjunta</h3>
                            {loading ? (
                                <p className="text-center text-gray-500 text-sm">Cargando...</p>
                            ) : (
                                details?.documentation && details.documentation.length > 0 ? (
                                    <ul className="divide-y divide-gray-200">
                                        {details.documentation.map((doc, index) => (
                                            <li key={index} className="py-2.5 px-2">
                                                <div className="flex items-center">
                                                    <div className="mr-3 flex-shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <a
                                                            href={`/api/files/${doc.filename}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 truncate block"
                                                            title={doc.filename}
                                                        >
                                                            {doc.originalFilename || doc.filename}
                                                        </a>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            Subido por {doc.uploader} el {new Date(doc.uploadDate).toLocaleDateString('es-AR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                {doc.origin === 'budget_request' && (
                                                    <div className="mt-1.5 pl-9">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            Presupuesto
                                                        </span>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center mt-4">No hay documentación.</p>
                                )
                            )}
                            
                            {/* ===> SECCIÓN DE OBSERVACIONES AÑADIDA AQUÍ <=== */}
                            <div className="mt-6">
                                {details && (
                                    <ObservationsChat 
                                        internmentId={request.id} 
                                        initialObservations={details.details?.observations || []} 
                                    />
                                )}
                            </div>
                        </aside>

                        {/* Columna central de información */}
                        <main className="flex-grow p-6 space-y-6 overflow-y-auto min-w-0">
                            {details && (
                                <>
                                    <section className="p-4 border rounded-lg bg-white">
                                        <h3 className="font-semibold text-lg mb-4 text-gray-800">Información General</h3>
                                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <DetailField icon={UserIcon} label="Beneficiario" value={details.beneficiary_name} />
                                            <DetailField icon={CalendarIcon} label="Fecha de Ingreso" value={new Date(details.admission_datetime).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })} />
                                            <DetailField icon={BuildingOffice2Icon} label="Prestador Notificador" value={request.provider_name} />
                                            <DetailField icon={ClipboardDocumentIcon} label="Motivo de Ingreso" value={details.admission_reason} />
                                            <DetailField icon={ClockIcon} label="Días de Internación" value={dayCounts.total} />
                                            <DetailField icon={ClockIcon} label="Días Hábiles de Internación" value={dayCounts.business} />
                                        </dl>
                                    </section>

                                    <section className="p-4 border rounded-lg bg-white">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-lg text-gray-800">Prácticas Asociadas</h3>
                                            <ActionButton onClick={() => onAttachPractice(request)} icon={PlusCircleIcon} disabled={isActionDisabled}>
                                                Solicitar Práctica
                                            </ActionButton>
                                        </div>
                                        {details.details?.practices && details.details.practices.length > 0 ? (
                                            <ul className="divide-y divide-gray-200">
                                                {details.details.practices.map(practice => (
                                                    <li key={practice.id}>
                                                        <button 
                                                            onClick={() => setSelectedPractice(practice)}
                                                            className="w-full text-left py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded-md transition-colors"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-blue-600 hover:text-blue-800">{practice.title}</p>
                                                                <p className="text-xs text-gray-500">Solicitada el: {new Date(practice.created_at).toLocaleDateString('es-ES')}</p>
                                                            </div>
                                                            <span className="text-sm font-semibold text-gray-600">{practice.status}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">No hay prácticas asociadas a esta internación.</p>
                                        )}
                                    </section>

                                    <section className="p-4 border rounded-lg bg-white">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-lg text-gray-800">Presupuestos Asociados</h3>
                                            <ActionButton onClick={handleOpenBudgetModal} icon={PlusCircleIcon} disabled={isActionDisabled}>
                                                Solicitar Presupuesto
                                            </ActionButton>
                                        </div>
                                        {budgetRequests.length > 0 ? (
                                            <ul className="divide-y divide-gray-200">
                                                {budgetRequests.map((budget, index) => {
                                                    const total = budget.concepts.reduce((sum, item) => sum + (item.quantity * item.value), 0);
                                                    return (
                                                        <li key={budget.id || index}>
                                                            <button 
                                                                onClick={() => setSelectedBudget(budget)}
                                                                className="w-full text-left py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded-md transition-colors"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                                                        Solicitud de Presupuesto #{index + 1}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Solicitado el: {new Date(budget.requested_at).toLocaleDateString('es-ES')} por {budget.requester_name}
                                                                    </p>
                                                                </div>
                                                                <span className="text-sm font-semibold text-gray-700">
                                                                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(total)}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">No hay presupuestos asociados a esta internación.</p>
                                        )}
                                    </section>

                                    <div className="p-4 border rounded-lg bg-white">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-lg text-gray-800">Historial de Prórrogas</h3>
                                            <ActionButton onClick={() => onOpenProrroga(request.id)} icon={PlusCircleIcon} disabled={isActionDisabled}>
                                                Solicitar Prórroga
                                            </ActionButton>
                                        </div>
                                        {details.details?.extension_requests && details.details.extension_requests.length > 0 ? (
                                            <ul className="divide-y divide-gray-200">
                                                {details.details.extension_requests.map((ext, index) => (
                                                    <li key={ext.id || index}>
                                                        <button 
                                                            onClick={() => setSelectedProrroga(ext)}
                                                            className="w-full text-left py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded-md"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                                                    Solicitud de {ext.requested_days} días
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    Solicitada el: {new Date(ext.requested_at).toLocaleDateString('es-ES')} por Dr. {ext.requesting_doctor}
                                                                </p>
                                                            </div>
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                ext.status === 'Pendiente de Auditoría' ? 'bg-yellow-100 text-yellow-800' : 
                                                                ext.status === 'Aprobada' ? 'bg-green-100 text-green-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {ext.status}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500">No hay prórrogas registradas.</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </main>

                        {/* Columna derecha para la línea de tiempo */}
                        <aside className="w-80 bg-white border-l p-6 overflow-y-auto flex-shrink-0">
                            <h3 className="font-semibold text-lg mb-4 text-gray-800">Trazabilidad</h3>
                            {loading ? (
                                 <p className="text-center text-gray-500 text-sm">Cargando...</p>
                            ) : (
                                <Timeline events={timelineEvents} />
                            )}
                        </aside>
                    </div>


                    <footer className="flex-shrink-0 p-4 border-t flex justify-end bg-gray-100 rounded-b-xl">
                        <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">
                            Cerrar
                        </button>
                    </footer>
                </div>
            </div>
            
            {isBudgetModalOpen && (
                <Modal isOpen={isBudgetModalOpen} onClose={handleCloseBudgetModal}>
                    <BudgetRequestForm
                        internmentId={request.id}
                        onSuccess={handleBudgetSuccess}
                        closeModal={handleCloseBudgetModal}
                    />
                </Modal>
            )}

            {selectedProrroga && (
                <Modal isOpen={!!selectedProrroga} onClose={() => setSelectedProrroga(null)}>
                    <ProrrogaDetailModal 
                        proroga={selectedProrroga} 
                        onClose={() => setSelectedProrroga(null)} 
                    />
                </Modal>
            )}

            {selectedPractice && (
                <Modal isOpen={!!selectedPractice} onClose={() => setSelectedPractice(null)}>
                    <AuthorizationForm
                        initialData={selectedPractice}
                        isReadOnly={true}
                        closeModal={() => setSelectedPractice(null)}
                        onSuccess={() => setSelectedPractice(null)}
                    />
                </Modal>
            )}

            {selectedBudget && (
                <Modal isOpen={!!selectedBudget} onClose={() => setSelectedBudget(null)}>
                    <BudgetDetailModal 
                        budget={selectedBudget}
                        onClose={() => setSelectedBudget(null)}
                    />
                </Modal>
            )}
        </>
    );
}
