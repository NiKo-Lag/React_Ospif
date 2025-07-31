'use client';

import { useState } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ExclamationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function CreateOrderForm({ onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Beneficiary validation states
  const [cuil, setCuil] = useState('');
  const [beneficiary, setBeneficiary] = useState(null);
  const [loadingBeneficiary, setLoadingBeneficiary] = useState(false);
  const [beneficiaryError, setBeneficiaryError] = useState('');
  
  const [formData, setFormData] = useState({
    // Order details
    diagnosis: '',
    requestingDoctor: '',
    urgencyLevel: 'Normal',
    specialObservations: '',
    highCost: false, // Nuevo campo para alto coste
    quotationDeadlineHours: 48, // Tiempo configurable para cotización
    
    // Items
    items: [
      {
        medicationName: '',
        dosage: '',
        quantity: 1,
        unit: 'comprimidos',
        specialInstructions: '',
        priority: 1
      }
    ]
  });

  const [validationErrors, setValidationErrors] = useState({});

  // Check if beneficiary section is unlocked
  const isBeneficiaryValid = beneficiary?.activo === true;

  // Handle beneficiary search
  const handleSearchBeneficiary = async () => {
    if (beneficiary && String(beneficiary.cuil) === String(cuil)) return;
    if (!cuil || !/^\d{11}$/.test(cuil)) {
      if (cuil) setBeneficiaryError('CUIL inválido. Debe contener 11 dígitos sin guiones.');
      return;
    }
    setLoadingBeneficiary(true);
    setBeneficiaryError('');
    setBeneficiary(null);
    try {
      const response = await fetch(`/api/beneficiary/${cuil}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setBeneficiary(data);
      if (!data.activo) {
        toast.error('El beneficiario se encuentra INACTIVO.');
      } else {
        toast.success('Beneficiario Activo encontrado.');
      }
    } catch (err) {
      setBeneficiaryError(err.message);
      toast.error(err.message);
    } finally {
      setLoadingBeneficiary(false);
    }
  };

  // Validation rules
  const validateStep = (stepNumber) => {
    const errors = {};

    if (stepNumber === 1) {
      if (!isBeneficiaryValid) errors.beneficiary = 'Debe seleccionar un beneficiario activo';
    }

    if (stepNumber === 2) {
      if (!formData.diagnosis.trim()) errors.diagnosis = 'Diagnóstico es requerido';
      if (!formData.requestingDoctor.trim()) errors.requestingDoctor = 'Médico solicitante es requerido';
    }

    if (stepNumber === 3) {
      formData.items.forEach((item, index) => {
        if (!item.medicationName.trim()) {
          errors[`items.${index}.medicationName`] = 'Nombre del medicamento es requerido';
        }
        if (!item.dosage.trim()) {
          errors[`items.${index}.dosage`] = 'Dosis es requerida';
        }
        if (!item.quantity || item.quantity <= 0) {
          errors[`items.${index}.quantity`] = 'Cantidad debe ser mayor a 0';
        }
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Handle CUIL change
  const handleCuilChange = (value) => {
    setCuil(value);
    setBeneficiaryError('');
    if (beneficiary && String(beneficiary.cuil) !== String(value)) {
      setBeneficiary(null);
    }
  };

  // Handle item field changes
  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
    
    // Clear validation error
    const errorKey = `items.${index}.${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => ({ ...prev, [errorKey]: null }));
    }
  };

  // Add new item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          medicationName: '',
          dosage: '',
          quantity: 1,
          unit: 'comprimidos',
          specialInstructions: '',
          priority: prev.items.length + 1
        }
      ]
    }));
  };

  // Remove item
  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Navigation
  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  // Get current step content
  const getCurrentStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    try {
      setLoading(true);
      setError(null);

      const orderData = {
        ...formData,
        beneficiaryName: beneficiary.nombre,
        beneficiaryCuil: beneficiary.cuil
      };

      const response = await fetch('/api/medication-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la orden');
      }

      const result = await response.json();
      // La API ahora devuelve un array de órdenes
      if (result.orders && result.orders.length > 0) {
        onSuccess(result.orders[0]); // Usar la primera orden para compatibilidad
      } else {
        onSuccess(result.order); // Fallback para compatibilidad
      }
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render step 1: Beneficiary validation
  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-semibold text-gray-700 mb-6">Paso 1: Buscar y confirmar beneficiario</h2>
      <div className="space-y-6">
        <div>
          <label htmlFor="beneficiary-search" className="block mb-2 text-sm font-medium text-gray-700">Buscar por DNI o Número de Afiliado</label>
          <div className="flex items-center gap-2">
            <input type="text" id="beneficiary-search" value={cuil} onChange={(e) => handleCuilChange(e.target.value)} className="w-full px-4 py-2 border rounded-md" placeholder="Ingrese DNI o N° de Afiliado..." />
            <button type="button" onClick={handleSearchBeneficiary} disabled={loadingBeneficiary} className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
              {loadingBeneficiary ? '...' : 'Buscar'}
            </button>
          </div>
        </div>
        {beneficiary && (
          <div className={`p-6 border rounded-lg ${beneficiary.activo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-gray-800">Beneficiario Encontrado</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${beneficiary.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {beneficiary.activo ? <CheckCircleIcon className="w-4 h-4 mr-1.5" /> : <XCircleIcon className="w-4 h-4 mr-1.5" />}
                {beneficiary.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-gray-600">Nombre:</span> {beneficiary.nombre}</div>
              <div><span className="font-medium text-gray-600">DNI:</span> {beneficiary.numeroDeDocumento}</div>
              <div><span className="font-medium text-gray-600">CUIL:</span> {beneficiary.cuil}</div>
              <div><span className="font-medium text-gray-600">Plan:</span> {beneficiary.fSssTipoDeBeneficiario?.nombre.toLowerCase().includes('relacion de dependencia') ? 'PLATINO' : 'BORDO'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render step 2: Order details
  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Información Médica</h3>
        <p className="text-gray-600">Completa los datos médicos de la orden de medicación</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Diagnóstico</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnóstico *
              </label>
              <textarea
                value={formData.diagnosis}
                onChange={(e) => handleChange('diagnosis', e.target.value)}
                rows={4}
                className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.diagnosis ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Descripción detallada del diagnóstico..."
              />
              {validationErrors.diagnosis && (
                <p className="text-red-600 text-sm mt-2">{validationErrors.diagnosis}</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Observaciones</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones Especiales
              </label>
              <textarea
                value={formData.specialObservations}
                onChange={(e) => handleChange('specialObservations', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observaciones adicionales, consideraciones especiales..."
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Médico</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Médico Solicitante *
                </label>
                <input
                  type="text"
                  value={formData.requestingDoctor}
                  onChange={(e) => handleChange('requestingDoctor', e.target.value)}
                  className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.requestingDoctor ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Dr. García"
                />
                {validationErrors.requestingDoctor && (
                  <p className="text-red-600 text-sm mt-2">{validationErrors.requestingDoctor}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Urgencia
                </label>
                <select
                  value={formData.urgencyLevel}
                  onChange={(e) => handleChange('urgencyLevel', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Muy Urgente">Muy Urgente</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.highCost}
                    onChange={(e) => handleChange('highCost', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Medicación de Alto Coste
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Marca esta opción si la medicación requiere cotización especial
                </p>
              </div>

              {formData.highCost && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiempo Límite para Cotización
                  </label>
                  <select
                    value={formData.quotationDeadlineHours || 48}
                    onChange={(e) => handleChange('quotationDeadlineHours', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={24}>24 horas hábiles</option>
                    <option value={48}>48 horas hábiles</option>
                    <option value={72}>72 horas hábiles</option>
                    <option value={96}>96 horas hábiles</option>
                    <option value={120}>120 horas hábiles</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Tiempo límite para que las farmacias respondan con sus cotizaciones
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Beneficiary summary */}
          {beneficiary && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Beneficiario Seleccionado</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Nombre:</span>
                  <span className="text-gray-900">{beneficiary.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">CUIL:</span>
                  <span className="text-gray-900">{beneficiary.cuil}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Estado:</span>
                  <span className="text-green-600 font-medium">Activo</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render step 3: Medication items
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Medicamentos</h3>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-4 h-4 mr-1" />
          Agregar Medicamento
        </button>
      </div>

      <div className="space-y-4">
        {formData.items.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-md font-medium text-gray-900">
                Medicamento #{index + 1}
              </h4>
              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Medicamento *
                </label>
                <input
                  type="text"
                  value={item.medicationName}
                  onChange={(e) => handleItemChange(index, 'medicationName', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors[`items.${index}.medicationName`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Metformina"
                />
                {validationErrors[`items.${index}.medicationName`] && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors[`items.${index}.medicationName`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosis *
                </label>
                <input
                  type="text"
                  value={item.dosage}
                  onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors[`items.${index}.dosage`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="500mg"
                />
                {validationErrors[`items.${index}.dosage`] && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors[`items.${index}.dosage`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleItemChange(index, 'quantity', '');
                    } else {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue)) {
                        handleItemChange(index, 'quantity', numValue);
                      }
                    }
                  }}
                  className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors[`items.${index}.quantity`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {validationErrors[`items.${index}.quantity`] && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors[`items.${index}.quantity`]}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad
                </label>
                <select
                  value={item.unit}
                  onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="comprimidos">Comprimidos</option>
                  <option value="cápsulas">Cápsulas</option>
                  <option value="ampollas">Ampollas</option>
                  <option value="frascos">Frascos</option>
                  <option value="jeringas">Jeringas</option>
                  <option value="unidades">Unidades</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instrucciones Especiales
              </label>
              <textarea
                value={item.specialInstructions}
                onChange={(e) => handleItemChange(index, 'specialInstructions', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Instrucciones especiales para este medicamento..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render step 4: Review and submit
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <CheckCircleIcon className="w-6 h-6 text-green-600 mr-2" />
        <h3 className="text-lg font-medium text-gray-900">Revisar Orden</h3>
      </div>

      {/* Order summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Resumen de la Orden</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Beneficiario:</span> {formData.beneficiaryName}
          </div>
          <div>
            <span className="font-medium">CUIL:</span> {formData.beneficiaryCuil}
          </div>
          <div>
            <span className="font-medium">Diagnóstico:</span> {formData.diagnosis}
          </div>
          <div>
            <span className="font-medium">Médico:</span> {formData.requestingDoctor}
          </div>
          <div>
            <span className="font-medium">Urgencia:</span> {formData.urgencyLevel}
          </div>
          <div>
            <span className="font-medium">Items:</span> {formData.items.length}
          </div>
        </div>
      </div>

      {/* Items summary */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Medicamentos</h4>
        {formData.items.map((item, index) => (
          <div key={index} className="border rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{item.medicationName} - {item.dosage}</div>
                <div className="text-sm text-gray-600">
                  {item.quantity} {item.unit}
                  {item.specialInstructions && ` • ${item.specialInstructions}`}
                </div>
              </div>
              <div className="text-sm text-gray-500">#{index + 1}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Special observations */}
      {formData.specialObservations && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Observaciones Especiales</h4>
          <p className="text-sm text-gray-700">{formData.specialObservations}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <div className="p-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= 1 ? 'bg-white border-2 border-indigo-600 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>1</div>
            <p className={`ml-3 font-medium transition-colors duration-300 ${step >= 1 ? 'text-indigo-600' : 'text-gray-500'}`}>Beneficiario</p>
          </div>
          <div className={`flex-1 h-1 mx-4 transition-colors duration-300 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= 2 ? 'bg-white border-2 border-indigo-600 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>2</div>
            <p className={`ml-3 font-medium transition-colors duration-300 ${step >= 2 ? 'text-indigo-600' : 'text-gray-500'}`}>Información Médica</p>
          </div>
          <div className={`flex-1 h-1 mx-4 transition-colors duration-300 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= 3 ? 'bg-white border-2 border-indigo-600 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>3</div>
            <p className={`ml-3 font-medium transition-colors duration-300 ${step >= 3 ? 'text-indigo-600' : 'text-gray-500'}`}>Medicamentos</p>
          </div>
          <div className={`flex-1 h-1 mx-4 transition-colors duration-300 ${step >= 4 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= 4 ? 'bg-white border-2 border-indigo-600 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>4</div>
            <p className={`ml-3 font-medium transition-colors duration-300 ${step >= 4 ? 'text-indigo-600' : 'text-gray-500'}`}>Revisar</p>
          </div>
        </div>
      </div>
      <div id="notification-form" className="p-8 pt-0">
        <div className={step === 1 ? 'block' : 'hidden'}>
          {renderStep1()}
        </div>
        <div className={step === 2 ? 'block' : 'hidden'}>
          {renderStep2()}
        </div>
        <div className={step === 3 ? 'block' : 'hidden'}>
          {renderStep3()}
        </div>
        <div className={step === 4 ? 'block' : 'hidden'}>
          {renderStep4()}
        </div>
      </div>

      <div className="p-8 pt-4 border-t flex justify-between">
        <button 
          type="button"
          onClick={prevStep} 
          disabled={step === 1 || loading}
          className="px-6 py-2 text-gray-700 bg-white border rounded-md hover:bg-gray-100 disabled:opacity-50"
        >
          Anterior
        </button>

        {step < 4 ? (
          <button 
            type="button"
            onClick={nextStep} 
            disabled={loading}
            className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Siguiente
          </button>
        ) : (
          <button 
            type="button"
            onClick={handleSubmit} 
            disabled={loading}
            className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Orden'}
          </button>
        )}
      </div>
    </div>
  );
} 