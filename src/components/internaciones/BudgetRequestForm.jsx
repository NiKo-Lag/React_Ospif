// src/components/internaciones/BudgetRequestForm.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { PlusCircleIcon, XCircleIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { PaperClipIcon, TrashIcon } from '@heroicons/react/24/outline';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
    }).format(value || 0);
};

const STEPS = [
    { number: 1, title: 'Información General' },
    { number: 2, title: 'Detalle de Conceptos' },
    { number: 3, title: 'Inclusiones y Exclusiones' },
    { number: 4, title: 'Resumen y Envío' },
];

export default function BudgetRequestForm({ internmentId, onSuccess, closeModal }) {
    const { data: session } = useSession();
    const [beneficiary, setBeneficiary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);

    const [formState, setFormState] = useState({
        concepts: [{ concept: '', quantity: 1, value: '' }],
        includeChecked: false,
        includeDetails: '',
        excludeChecked: false,
        excludeDetails: '',
        additionalComments: '',
        requesterName: '',
    });

    const [files, setFiles] = useState([]);

    useEffect(() => {
        async function fetchData() {
            if (!internmentId) return;
            setLoading(true);
            try {
                const response = await fetch(`/api/portal/internments/${internmentId}`);
                if (!response.ok) throw new Error('No se pudieron cargar los datos del beneficiario.');
                const data = await response.json();
                setBeneficiary({ name: data.beneficiary_name, cuil: data.beneficiary_cuil });
            } catch (err) {
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [internmentId]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormState(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleConceptChange = (index, e) => {
        const { name, value } = e.target;
        const updatedConcepts = [...formState.concepts];
        updatedConcepts[index][name] = value;
        setFormState(prev => ({ ...prev, concepts: updatedConcepts }));
    };

    const addConcept = () => {
        setFormState(prev => ({
            ...prev,
            concepts: [...prev.concepts, { concept: '', quantity: 1, value: '' }],
        }));
    };

    const removeConcept = (index) => {
        if (formState.concepts.length <= 1) return;
        const updatedConcepts = [...formState.concepts];
        updatedConcepts.splice(index, 1);
        setFormState(prev => ({ ...prev, concepts: updatedConcepts }));
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const totalAmount = useMemo(() => {
        return formState.concepts.reduce((total, concept) => {
            const quantity = parseFloat(concept.quantity) || 0;
            const value = parseFloat(concept.value) || 0;
            return total + quantity * value;
        }, 0);
    }, [formState.concepts]);

    const nextStep = () => setStep(prev => Math.min(prev + 1, STEPS.length));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Enviando solicitud y adjuntos...');

        const formData = new FormData();
        // Adjuntamos los datos del formulario como un string JSON
        formData.append('budgetData', JSON.stringify(formState));
        // Adjuntamos cada archivo
        files.forEach(file => {
            formData.append('files', file);
        });

        try {
            const response = await fetch(`/api/portal/internments/${internmentId}/request-budget`, {
                method: 'POST',
                body: formData, // No se necesita 'headers' cuando se usa FormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al enviar la solicitud.');
            }

            toast.success('Solicitud de presupuesto enviada con éxito.', { id: toastId });
            onSuccess();
        } catch (error) {
            toast.error(error.message, { id: toastId });
        }
    };

    if (loading) {
        return <div className="p-6 text-center">Cargando datos...</div>;
    }

    const StepNavigation = () => (
        <div className="w-1/4 bg-gray-50 p-6 border-r flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Solicitud de Presupuesto</h2>
            <nav className="space-y-2">
                {STEPS.map((s) => (
                    <button
                        key={s.number}
                        type="button"
                        onClick={() => s.number < step && setStep(s.number)}
                        className={`w-full text-left p-3 rounded-lg flex items-center transition-colors duration-200 ${
                            step === s.number
                                ? 'bg-indigo-100 text-indigo-700 font-bold'
                                : s.number < step
                                ? 'hover:bg-gray-200 cursor-pointer'
                                : 'text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {s.number < step ? (
                            <CheckCircleIcon className="w-6 h-6 mr-3 text-green-500" />
                        ) : (
                            <span
                                className={`w-6 h-6 mr-3 rounded-full flex items-center justify-center text-sm ${
                                    step === s.number ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                                }`}
                            >
                                {s.number}
                            </span>
                        )}
                        {s.title}
                    </button>
                ))}
            </nav>
        </div>
    );

    return (
        <div className="flex h-full w-full overflow-hidden rounded-lg">
            <StepNavigation />

            <div className="w-3/4 flex flex-col bg-white">
                {/* Header del panel de contenido */}
                <div className="p-6 border-b">
                    <h3 className="text-xl font-semibold text-gray-700">{STEPS.find(s => s.number === step)?.title}</h3>
                </div>

                {/* Contenido del paso (con scroll) */}
                <div className="flex-grow p-6 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-gray-50">
                                <div><p className="text-sm font-medium text-gray-600">Solicitante (Prestador)</p><p className="font-semibold">{session?.user?.name}</p></div>
                                <div><p className="text-sm font-medium text-gray-600">Fecha de Solicitud</p><p className="font-semibold">{new Date().toLocaleDateString('es-AR')}</p></div>
                                <div><p className="text-sm font-medium text-gray-600">Beneficiario</p><p className="font-semibold">{beneficiary?.name}</p></div>
                                <div><p className="text-sm font-medium text-gray-600">CUIL Beneficiario</p><p className="font-semibold">{beneficiary?.cuil}</p></div>
                            </div>
                             <div>
                                <label htmlFor="requesterName" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Administrativo/Solicitante</label>
                                <input type="text" id="requesterName" name="requesterName" value={formState.requesterName} onChange={handleInputChange} className="w-full p-2 border rounded-md" placeholder="Ej: Juan Pérez, Administración" required />
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            {formState.concepts.map((item, index) => (
                                <div key={index} className="flex items-center gap-4">
                                    <input type="text" name="concept" placeholder="Concepto" value={item.concept} onChange={(e) => handleConceptChange(index, e)} className="w-1/2 p-2 border rounded-md" required />
                                    <input type="number" name="quantity" placeholder="Cantidad" value={item.quantity} onChange={(e) => handleConceptChange(index, e)} className="w-1/4 p-2 border rounded-md" min="1" required />
                                    <input type="number" name="value" placeholder="Valor Unitario" value={item.value} onChange={(e) => handleConceptChange(index, e)} className="w-1/4 p-2 border rounded-md" min="0" step="0.01" required />
                                    <button type="button" onClick={() => removeConcept(index)} disabled={formState.concepts.length <= 1}>
                                        <XCircleIcon className={`w-6 h-6 ${formState.concepts.length > 1 ? 'text-red-500 hover:text-red-700' : 'text-gray-300'}`} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addConcept} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                <PlusCircleIcon className="w-5 h-5" />
                                Agregar más conceptos
                            </button>
                            <div className="text-right font-bold text-xl mt-4 border-t pt-4">
                                Total: {formatCurrency(totalAmount)}
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-4 border rounded-md">
                                    <label className="flex items-center gap-3">
                                        <input type="checkbox" name="includeChecked" checked={formState.includeChecked} onChange={handleInputChange} className="h-5 w-5 rounded text-indigo-600" />
                                        <span className="font-medium text-gray-700">Inclusiones</span>
                                    </label>
                                    {formState.includeChecked && (
                                        <textarea name="includeDetails" value={formState.includeDetails} onChange={handleInputChange} rows="4" className="w-full p-2 border rounded-md mt-4" placeholder="Detalle las inclusiones..."></textarea>
                                    )}
                                </div>
                                <div className="p-4 border rounded-md">
                                    <label className="flex items-center gap-3">
                                        <input type="checkbox" name="excludeChecked" checked={formState.excludeChecked} onChange={handleInputChange} className="h-5 w-5 rounded text-indigo-600" />
                                        <span className="font-medium text-gray-700">Exclusiones</span>
                                    </label>
                                     {formState.excludeChecked && (
                                        <textarea name="excludeDetails" value={formState.excludeDetails} onChange={handleInputChange} rows="4" className="w-full p-2 border rounded-md mt-4" placeholder="Detalle las exclusiones..."></textarea>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label htmlFor="additionalComments" className="block text-sm font-medium text-gray-700 mb-1">Comentarios Adicionales</label>
                                <textarea id="additionalComments" name="additionalComments" value={formState.additionalComments} onChange={handleInputChange} rows="3" className="w-full p-2 border rounded-md"></textarea>
                            </div>
                        </div>
                    )}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Resumen de la Solicitud</h3>
                                {/* Renderizar un resumen de solo lectura de formState */}
                                <p><strong>Administrativo:</strong> {formState.requesterName}</p>
                                <p><strong>Conceptos:</strong></p>
                                <ul>{formState.concepts.map(c => <li key={c.concept}>{c.quantity} x {c.concept} - {formatCurrency(c.value)} c/u</li>)}</ul>
                                <p><strong>Total:</strong> {formatCurrency(totalAmount)}</p>
                                {formState.includeChecked && <p><strong>Inclusiones:</strong> {formState.includeDetails || "Sí"}</p>}
                                {formState.excludeChecked && <p><strong>Exclusiones:</strong> {formState.excludeDetails || "Sí"}</p>}
                                {formState.additionalComments && <p><strong>Comentarios:</strong> {formState.additionalComments}</p>}
                            </div>
                            
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Adjuntar Documentación</h3>
                                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <PaperClipIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                <span>Seleccione archivos</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                            </label>
                                            <p className="pl-1">o arrástrelos aquí</p>
                                        </div>
                                        <p className="text-xs text-gray-500">PDF, PNG, JPG, etc.</p>
                                    </div>
                                </div>
                                {files.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold">Archivos seleccionados:</h4>
                                        <ul className="mt-2 border rounded-md divide-y">
                                            {files.map((file, index) => (
                                                <li key={index} className="px-3 py-2 flex items-center justify-between text-sm">
                                                    <span>{file.name}</span>
                                                    <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer del panel de contenido con botones */}
                <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                    <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancelar
                    </button>
                    <div className="flex gap-4">
                        {step > 1 && (
                            <button type="button" onClick={prevStep} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-md border hover:bg-gray-100">
                                <ArrowLeftIcon className="w-5 h-5" /> Anterior
                            </button>
                        )}
                        {step < STEPS.length ? (
                            <button type="button" onClick={nextStep} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                Siguiente <ArrowRightIcon className="w-5 h-5" />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                Enviar Solicitud
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
} 