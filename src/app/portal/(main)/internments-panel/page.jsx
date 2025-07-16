// src/app/portal/(main)/internments-panel/page.jsx

"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDownIcon, CheckCircleIcon, XCircleIcon, ClockIcon, EllipsisVerticalIcon } from '@heroicons/react/24/solid';
import toast, { Toaster } from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import InternmentDetailModal from '@/components/internaciones/InternmentDetailModal';
import ProrrogaForm from '@/components/internaciones/ProrrogaForm';
import UploadDocumentationForm from '@/components/internaciones/UploadDocumentationForm';

// Componente para la insignia de estado (genérico)
const StatusBadge = ({ status }) => {
    const styles = {
        'Activa': { icon: CheckCircleIcon, color: 'bg-green-100 text-green-800' },
        'Finalizada': { icon: XCircleIcon, color: 'bg-gray-100 text-gray-700' },
        'Pendiente de Auditoría': { icon: ClockIcon, color: 'bg-yellow-100 text-yellow-800' },
        'Aceptada': { icon: CheckCircleIcon, color: 'bg-green-100 text-green-800' },
        'Rechazada': { icon: XCircleIcon, color: 'bg-red-100 text-red-800' },
        'default': { icon: ClockIcon, color: 'bg-gray-100 text-gray-800' },
    };
    const { icon: Icon, color } = styles[status] || styles.default;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
            <Icon className="w-4 h-4 mr-1.5" />
            {status}
        </span>
    );
};

// Componente para la fila de detalles que se carga al expandir
const DetailRow = ({ internmentId, refreshTrigger }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/internment/${internmentId}`, { cache: 'no-store' });
                if (!response.ok) throw new Error('No se pudieron cargar los detalles.');
                const data = await response.json();
                setDetails(data);
            } catch (err) {
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [internmentId, refreshTrigger]);

    if (loading) return <td colSpan="6" className="p-0"><div className="p-6 text-center text-gray-500">Cargando detalles...</div></td>;
    if (!details) return <td colSpan="6" className="p-0"><div className="p-6 text-center text-red-500">No se pudieron cargar los detalles.</div></td>;

    const associatedItems = [
        ...(details.practices || []).map(p => ({ ...p, itemType: 'Autorización' })),
        ...(details.details?.extension_requests || []).map(ext => ({ ...ext, id: ext.id, title: `${ext.requested_days} días`, status: ext.status, itemType: 'Prórroga' }))
    ];

    return (
        <td colSpan="6" className="p-0">
            <div className="bg-slate-50 p-4">
                {associatedItems.length > 0 ? (
                    <table className="min-w-full bg-white rounded-md border table-fixed">
                        <thead className="sr-only">
                            <tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Acciones</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {associatedItems.map(item => (
                                <tr key={item.id} className="text-sm">
                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-800 truncate">{item.title}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 w-32">{item.itemType}</td>
                                    <td className="px-4 py-3 whitespace-nowrap w-40"><StatusBadge status={item.status} /></td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium w-20">
                                        <button className="text-indigo-600 hover:text-indigo-800">Ver</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No hay solicitudes asociadas para esta internación.</p>
                    </div>
                )}
            </div>
        </td>
    );
};

export default function InternmentsPanelPage() {
    const [internments, setInternments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Activa');
    const [expandedRowId, setExpandedRowId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);
    
    const [detailModal, setDetailModal] = useState({ isOpen: false, request: null });
    const [prorrogaModal, setProrrogaModal] = useState({ isOpen: false, internmentId: null });
    const [uploadModal, setUploadModal] = useState({ isOpen: false, internmentId: null });
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchInternments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/portal/internments-panel');
            if (!response.ok) throw new Error('No se pudieron cargar las internaciones.');
            const data = await response.json();
            setInternments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInternments();
    }, [fetchInternments]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const displayedInternments = useMemo(() => {
        return internments.filter(i => i.status === activeTab);
    }, [internments, activeTab]);

    const handleToggleRow = (internmentId) => {
        setExpandedRowId(prevId => (prevId === internmentId ? null : internmentId));
    };
    
    const handleToggleMenu = (e, internmentId) => {
        e.stopPropagation();
        setOpenMenuId(prevId => (prevId === internmentId ? null : internmentId));
    };

    const handleOpenDetailModal = (internment) => {
        setDetailModal({ isOpen: true, request: internment });
        setOpenMenuId(null);
    };

    const handleCloseDetailModal = () => {
        setDetailModal({ isOpen: false, request: null });
    };

    const handleOpenProrrogaModal = (internmentId) => {
        setProrrogaModal({ isOpen: true, internmentId: internmentId });
        setOpenMenuId(null);
    };

    const handleCloseProrrogaModal = () => {
        setProrrogaModal({ isOpen: false, internmentId: null });
    };

    const handleProrrogaSuccess = () => {
        handleCloseProrrogaModal();
        toast.success('Solicitud de prórroga enviada con éxito.');
        setRefreshTrigger(prev => prev + 1);
    };

    const handleOpenUploadModal = (internmentId) => {
        setUploadModal({ isOpen: true, internmentId: internmentId });
        setOpenMenuId(null);
    };

    const handleCloseUploadModal = () => {
        setUploadModal({ isOpen: false, internmentId: null });
    };

    const handleUploadSuccess = () => {
        handleCloseUploadModal();
        toast.success('Documentación subida con éxito.');
        setRefreshTrigger(prev => prev + 1);
    };

    if (loading) return <div className="text-center text-gray-500 p-8">Cargando internaciones...</div>;
    if (error) return <div className="text-center text-red-500 p-8">Error: {error}</div>;

    return (
        <>
            <Toaster position="top-center" />
            <div className="bg-white rounded-xl shadow-md">
                <div className="p-6 sm:p-8">
                    <header>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Panel de Internaciones</h1>
                        <p className="mt-1 text-sm text-gray-500">Gestiona todas las internaciones denunciadas por tu centro.</p>
                    </header>
                    <nav className="mt-6 border-b border-gray-200">
                        <div className="flex space-x-6">
                            <button onClick={() => setActiveTab('Activa')} className={`tab-button py-2 px-1 text-sm font-semibold border-b-2 ${activeTab === 'Activa' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Activas</button>
                            <button onClick={() => setActiveTab('Finalizada')} className={`tab-button py-2 px-1 text-sm font-semibold border-b-2 ${activeTab === 'Finalizada' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Finalizadas</button>
                        </div>
                    </nav>
                </div>
                <div className="w-full">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Beneficiario</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha de Ingreso</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {displayedInternments.map((internment, index) => {
                                const isLastItem = index >= displayedInternments.length - 3 && displayedInternments.length > 4;
                                return (
                                <React.Fragment key={internment.id}>
                                    {/* --- CORRECCIÓN: Se llama a la función correcta 'handleToggleRow' --- */}
                                    <tr className={`main-row hover:bg-gray-50 cursor-pointer ${expandedRowId === internment.id ? 'bg-indigo-50' : ''}`} onClick={() => handleToggleRow(internment.id)}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{internment.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{internment.beneficiary_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{internment.admissionDate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{internment.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={internment.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="relative inline-block text-left actions-menu" ref={openMenuId === internment.id ? menuRef : null}>
                                                <button onClick={(e) => handleToggleMenu(e, internment.id)} className="kebab-menu-button p-1 rounded-full hover:bg-gray-200">
                                                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                                                </button>
                                                {openMenuId === internment.id && (
                                                    <div className={`origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 ${isLastItem ? 'bottom-full mb-1' : ''}`}>
                                                        <div className="py-1">
                                                            <button onClick={(e) => { e.stopPropagation(); handleOpenDetailModal(internment); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Ver Detalle Completo</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleOpenProrrogaModal(internment.id); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Solicitar Prórroga</button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleOpenUploadModal(internment.id); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Cargar Documentación</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRowId === internment.id && (
                                        <tr className="sublist-row">
                                            <DetailRow internmentId={internment.id} refreshTrigger={refreshTrigger} />
                                        </tr>
                                    )}
                                </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    {displayedInternments.length === 0 && (
                        <div className="text-center py-12"><p className="text-gray-500">No hay internaciones en estado "{activeTab}".</p></div>
                    )}
                </div>
            </div>

            <Modal isOpen={detailModal.isOpen} onClose={handleCloseDetailModal}>
                <InternmentDetailModal request={detailModal.request} onClose={handleCloseDetailModal} onOpenProrroga={handleOpenProrrogaModal} />
            </Modal>

            <Modal isOpen={prorrogaModal.isOpen} onClose={handleCloseProrrogaModal}>
                <ProrrogaForm 
                    internmentId={prorrogaModal.internmentId}
                    onSuccess={handleProrrogaSuccess}
                    closeModal={handleCloseProrrogaModal}
                />
            </Modal>

            <Modal isOpen={uploadModal.isOpen} onClose={handleCloseUploadModal}>
                <UploadDocumentationForm
                    internmentId={uploadModal.internmentId}
                    onSuccess={handleUploadSuccess}
                    closeModal={handleCloseUploadModal}
                />
            </Modal>
        </>
    );
}
