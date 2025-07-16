// src/components/internaciones/UploadDocumentationForm.jsx

"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { UploadCloudIcon } from '@heroicons/react/24/outline';

const DropZone = ({ files, setFiles }) => {
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50');
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(droppedFiles);
    };
    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
    };

    return (
        <div>
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input')?.click()}
                className="mt-2 flex justify-center items-center w-full h-48 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-indigo-500 hover:bg-gray-50 transition-colors"
            >
                <input id="file-upload-input" type="file" multiple className="hidden" onChange={handleFileSelect} />
                <div className="space-y-1 text-center">
                    <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-sm text-gray-600">Arrastre y suelte archivos aquí, o <span className="font-medium text-indigo-600">haga clic para seleccionar</span></p>
                    <p className="text-xs text-gray-500">PDF, PNG, JPG, etc.</p>
                </div>
            </div>
            <div className="mt-4 text-sm text-gray-700 space-y-1">
                {files.map((file, index) => (
                    <div key={index} className="p-2 bg-gray-100 rounded-md">{file.name}</div>
                ))}
            </div>
        </div>
    );
};

export default function UploadDocumentationForm({ internmentId, onSuccess, closeModal }) {
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) {
            toast.error('Debe seleccionar al menos un archivo para subir.');
            return;
        }
        setIsSubmitting(true);
        const toastId = toast.loading('Subiendo documentación...');
        
        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            // --- CORRECCIÓN: Se añade '/portal' a la URL para que coincida con la API ---
            const response = await fetch(`/api/portal/internment/${internmentId}/upload`, {
                method: 'PATCH',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo subir la documentación.');
            }

            toast.success('Documentación subida con éxito.', { id: toastId });
            onSuccess();
        } catch (error) {
            toast.error(error.message, { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Cargar Documentación a Internación #{internmentId}</h2>
                <button type="button" onClick={closeModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-200"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            
            <DropZone files={files} setFiles={setFiles} />

            <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-lg border">Cancelar</button>
                <button type="submit" disabled={isSubmitting || files.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50">
                    {isSubmitting ? 'Subiendo...' : 'Subir Archivos'}
                </button>
            </div>
        </form>
    );
}
