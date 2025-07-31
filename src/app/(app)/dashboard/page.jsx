"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  PlusIcon,
  UserPlusIcon,
  HeartIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  PencilIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClipboardDocumentIcon,
  BellIcon,
  ShareIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  StarIcon,
  TrophyIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  XCircleIcon,
  CheckCircleIcon as CheckCircleSolidIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartSolidIcon,
  BeakerIcon,
  TruckIcon,
  CubeIcon
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import InternmentDetailModal from '@/components/internaciones/InternmentDetailModal';
import MedicationDetailModal from '@/components/medication/MedicationDetailModal';
import AuthorizationForm from '@/components/autorizaciones/AuthorizationForm';

// Componente para las tarjetas de estadísticas
const StatCard = ({ title, value, icon: Icon, color, bgColor }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm flex items-center space-x-4">
    <div className={`rounded-full p-3 ${bgColor}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

// Componente para botones de acción rápida
const QuickActionButton = ({ text, icon: Icon, onClick }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
  >
    <Icon className="w-5 h-5" />
    <span>{text}</span>
  </button>
);

// Componente para las filas de solicitudes
const RequestRow = ({ request, onBeneficiaryClick, onViewDetails }) => {
  const statusStyles = { 
    'Pendiente': 'bg-yellow-100 text-yellow-800', 
    'Requiere Auditoría': 'bg-red-100 text-red-800',
    'En Auditoría': 'bg-blue-100 text-blue-800',
    'Autorizada': 'bg-green-100 text-green-800',
    'Rechazada': 'bg-red-100 text-red-800'
  };

  const typeIcons = { 
    'Internación': <HeartSolidIcon className="w-4 h-4 text-red-500" />, 
    'Prácticas': <ClipboardDocumentIcon className="w-4 h-4 text-blue-500" />, 
    'Medicación': <BeakerIcon className="w-4 h-4 text-green-500" />, 
    'Traslado': <TruckIcon className="w-4 h-4 text-orange-500" />, 
    'Prótesis': <CubeIcon className="w-4 h-4 text-indigo-500" /> 
  };

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          {typeIcons[request.type] || <PlusIcon className="w-4 h-4 text-gray-500" />}
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{request.id}</p>
            <p className="text-xs text-gray-500 truncate">{request.type}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <button 
          onClick={() => onBeneficiaryClick(request.beneficiaryId)} 
          className="text-indigo-600 hover:text-indigo-900 hover:underline text-sm truncate max-w-32"
        >
          {request.beneficiary}
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-gray-600 text-sm truncate max-w-32">{request.provider}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
        {new Date(request.date).toLocaleDateString('es-AR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric'
        })}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[request.status] || 'bg-gray-100 text-gray-800'}`}>
          {request.status}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
        <button 
          onClick={() => onViewDetails(request)}
          className="text-indigo-600 hover:text-indigo-900 text-xs"
        >
          Ver Detalle
        </button>
      </td>
    </tr>
  );
};

// Componente para el modal de perfil de beneficiario
const BeneficiaryProfileModal = ({ beneficiary, onClose }) => {
  const [activeTab, setActiveTab] = useState('Internación');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingClinical, setIsEditingClinical] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState(null);
  
  const [profileText, setProfileText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [medicationText, setMedicationText] = useState('');

  // Cargar datos reales del perfil cuando se abre el modal
  useEffect(() => {
    if (beneficiary?.cuil) {
      fetchBeneficiaryProfile(beneficiary.cuil);
    }
  }, [beneficiary]);

  const fetchBeneficiaryProfile = async (cuil) => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching profile for CUIL:', cuil);
      const response = await fetch(`/api/beneficiary/${cuil}/profile`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Error al cargar el perfil del beneficiario');
      }
      
      const data = await response.json();
      console.log('Profile data received:', data);
      setProfileData(data);
      
      // Inicializar los campos editables
      setProfileText(data.internalProfile || '');
      setChronicText((data.chronicConditions || []).join(', '));
      setMedicationText((data.chronicMedication || []).join(', '));
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dobString) => {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const InfoRow = ({ label, children }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="text-sm font-medium text-gray-800 text-right">{children}</div>
    </div>
  );

  const KpiItem = ({ icon, label, children }) => (
    <div className="flex items-center space-x-3">
      <div className="bg-gray-100 p-2 rounded-lg">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <div className="font-bold text-gray-800">{children}</div>
      </div>
    </div>
  );

  const AlertBanner = ({ text }) => (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg mb-6 flex items-center">
      <ExclamationTriangleIcon className="w-5 h-5 mr-3" />
      <p className="font-bold">{text}</p>
    </div>
  );

  const kpis = useMemo(() => {
    if (!profileData || !profileData.history || profileData.history.length === 0) {
      return { total: 0, frequency: "N/A", topProvider: "N/A", rank: "N/A", totalBeneficiaries: 1 };
    }
    
    const total = profileData.history.length;
    
    const dates = profileData.history.map(h => new Date(h.date));
    const minDate = new Date(Math.min.apply(null, dates));
    const maxDate = new Date(Math.max.apply(null, dates));
    const months = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1;
    const frequency = (total / (months || 1)).toFixed(1);

    const providerCounts = profileData.history.reduce((acc, h) => {
      if(h.provider) acc[h.provider] = (acc[h.provider] || 0) + 1;
      return acc;
    }, {});
    const topProvider = Object.keys(providerCounts).reduce((a, b) => providerCounts[a] > providerCounts[b] ? a : b, "N/A");

    // Mock ranking calculation
    const rank = 1; // En producción esto vendría de una comparación real
    const totalBeneficiaries = 100; // En producción esto vendría de la base de datos

    return { total, frequency, topProvider, rank, totalBeneficiaries };
  }, [profileData]);

  const historyByType = useMemo(() => {
    if (!profileData?.history) return {};
    return profileData.history.reduce((acc, item) => {
      if (!acc[item.type]) { acc[item.type] = []; }
      acc[item.type].push(item);
      return acc;
    }, {});
  }, [profileData?.history]);

  const tabs = ['Internación', 'Prácticas', 'Medicación', 'Traslado', 'Prótesis'];

  const criticalStatus = profileData?.status !== 'Activo' ? `Beneficiario en estado ${profileData?.status}` : profileData?.reviewStatus !== 'Al día' ? `Situación de revista: ${profileData?.reviewStatus}` : null;

  if (!beneficiary) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Cargando perfil del beneficiario...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar perfil</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay datos del perfil, mostrar mensaje
  if (!profileData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Perfil no encontrado</h3>
            <p className="text-gray-600 mb-4">No se pudieron cargar los datos del beneficiario.</p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-50 rounded-2xl w-full max-w-6xl max-h-[90vh] h-fit flex flex-col shadow-lg">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">Perfil del Beneficiario: {profileData?.nombre || beneficiary.nombre}</h2>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${profileData?.status === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
              {profileData?.status || 'Cargando...'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <ShareIcon className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-7 h-7" />
            </button>
          </div>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {criticalStatus && <AlertBanner text={criticalStatus} />}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-lg mb-4">Datos Personales</h3>
              <div className="space-y-1">
                <InfoRow label="N° Afiliado">
                  <span>{profileData?.memberId || beneficiary.memberId}</span>
                </InfoRow>
                <InfoRow label="CUIL">
                  <span>{profileData?.cuil || beneficiary.cuil}</span>
                </InfoRow>
                <InfoRow label="Sexo">
                  <span>{profileData?.fSssSexoCodigo || 'No especificado'}</span>
                </InfoRow>
                <InfoRow label="Edad">
                  <span>{profileData?.fechaNacimiento ? calculateAge(profileData.fechaNacimiento) : 0} años</span>
                </InfoRow>
                <InfoRow label="Dirección">
                  <span>{profileData?.calle || 'No especificada'}</span>
                </InfoRow>
                <InfoRow label="Provincia">
                  <span>{profileData?.fSssProvincia?.nombre || 'No especificada'}</span>
                </InfoRow>
                <InfoRow label="Tipo Beneficiario">
                  <span>{profileData?.fSssParentesco?.nombre || 'No especificado'}</span>
                </InfoRow>
                <InfoRow label="Plan">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    profileData?.planType === 'Platino' ? 'bg-gray-700 text-white' : 'bg-amber-600 text-white'
                  }`}>
                    {profileData?.planType || beneficiary.planType}
                  </span>
                </InfoRow>
                <InfoRow label="Discapacidad">
                  <span>{profileData?.fSssIncapacitadoTipoCodigo === '01' ? 'Sí' : 'No'}</span>
                </InfoRow>
                <InfoRow label="Situación Revista">
                  <span>{profileData?.fSssSituacionDeRevista?.nombre || 'No especificada'}</span>
                </InfoRow>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-lg mb-4">KPIs de Consumo</h3>
              <div className="space-y-4">
                <KpiItem icon={<ArrowTrendingUpIcon className="w-5 h-5 text-green-600"/>}>
                  <p>{kpis.total} Consumos Totales</p>
                </KpiItem>
                <KpiItem icon={<ArrowPathIcon className="w-5 h-5 text-blue-600"/>}>
                  <p>{`${kpis.frequency} / mes`}</p>
                </KpiItem>
                <KpiItem icon={<StarIcon className="w-5 h-5 text-yellow-600"/>}>
                  <p>{kpis.topProvider}</p>
                </KpiItem>
                <KpiItem icon={<TrophyIcon className="w-5 h-5 text-indigo-600"/>}>
                  <div className="w-full">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Ranking</span>
                      <span>{`${kpis.rank} / ${kpis.totalBeneficiaries}`}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full" 
                        style={{ width: `${(1 - (kpis.rank - 1) / kpis.totalBeneficiaries) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </KpiItem>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Resumen Clínico</h3>
                <button 
                  onClick={() => setIsEditingClinical(!isEditingClinical)} 
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                >
                  {isEditingClinical ? (
                    <>
                      <DocumentTextIcon className="w-4 h-4" />
                      <span>Guardar</span>
                    </>
                  ) : (
                    <>
                      <PencilIcon className="w-4 h-4" />
                      <span>Editar</span>
                    </>
                  )}
                </button>
              </div>
              {isEditingClinical ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enfermedades Crónicas (separadas por coma)
                    </label>
                    <input 
                      type="text" 
                      value={chronicText} 
                      onChange={(e) => setChronicText(e.target.value)} 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medicación Mensual (separada por coma)
                    </label>
                    <input 
                      type="text" 
                      value={medicationText} 
                      onChange={(e) => setMedicationText(e.target.value)} 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Enfermedades Crónicas</h4>
                    <div className="flex flex-wrap gap-2">
                      {chronicText.split(',').map(c => c.trim()).filter(c => c).length > 0 ? 
                        chronicText.split(',').map(c => c.trim()).filter(c => c).map(c => (
                          <span key={c} className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center">
                            <ExclamationTriangleIcon className="w-3 h-3 mr-1.5"/>
                            {c}
                          </span>
                        )) : 
                        <p className="text-xs text-gray-400">No registradas.</p>
                      }
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Medicación Mensual</h4>
                    <div className="flex flex-wrap gap-2">
                      {medicationText.split(',').map(m => m.trim()).filter(m => m).length > 0 ? 
                        medicationText.split(',').map(m => m.trim()).filter(m => m).map(m => (
                          <span key={m} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
                            {m}
                          </span>
                        )) : 
                        <p className="text-xs text-gray-400">No registrada.</p>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Comentarios Internos</h3>
                <button 
                  onClick={() => setIsEditingProfile(!isEditingProfile)} 
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                >
                  {isEditingProfile ? (
                    <>
                      <DocumentTextIcon className="w-4 h-4" />
                      <span>Guardar</span>
                    </>
                  ) : (
                    <>
                      <PencilIcon className="w-4 h-4" />
                      <span>Editar</span>
                    </>
                  )}
                </button>
              </div>
              {isEditingProfile ? (
                <textarea 
                  value={profileText} 
                  onChange={(e) => setProfileText(e.target.value)} 
                  className="w-full h-24 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {profileText || 'No hay notas en el perfil.'}
                </p>
              )}
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-lg mb-4">Historial de Prácticas</h3>
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                  {tabs.map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)} 
                      className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab 
                          ? 'border-indigo-500 text-indigo-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
              </div>
              <div className="mt-4 space-y-3 h-[25vh] overflow-y-auto pr-2">
                {(historyByType[activeTab] || []).length > 0 ? (
                  historyByType[activeTab].map(item => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-sm">
                        {new Date(item.date).toLocaleDateString('es-AR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })} - 
                        <span className={
                          item.status === 'Aprobado' ? 'text-green-600' : 
                          item.status === 'Rechazado' ? 'text-red-600' : 
                          'text-yellow-600'
                        }>
                          {item.status}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center pt-10">
                    No hay registros para esta categoría.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para el modal de búsqueda de beneficiarios
const SearchBeneficiaryModal = ({ isOpen, onClose, onSelectBeneficiary }) => {
  const [cuil, setCuil] = useState('');
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(cuil)) {
      toast.error('CUIL inválido. Debe contener 11 dígitos sin guiones.');
      return;
    }
    
    setLoading(true);
    setError('');
    setBeneficiary(null);
    const toastId = toast.loading('Buscando afiliado...');

    try {
      const response = await fetch(`/api/beneficiary/${cuil}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se encontró al afiliado.');
      }

      setBeneficiary(data);
      toast.success('Afiliado encontrado.', { id: toastId });
    } catch (err) {
      setError(err.message);
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (beneficiary) => {
    onSelectBeneficiary(beneficiary);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Verificar Afiliado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">Ingresa el CUIL del afiliado para consultar su estado actual.</p>
          <form onSubmit={handleSearch} className="flex items-center space-x-4">
            <div className="flex-grow">
              <label htmlFor="cuil" className="sr-only">CUIL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircleIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="cuil"
                  id="cuil"
                  value={cuil}
                  onChange={(e) => setCuil(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ingrese el CUIL sin guiones"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>

        {beneficiary && (
          <div className="mt-6">
            <BeneficiaryResultCard beneficiary={beneficiary} onSelect={handleSelect} />
          </div>
        )}
        
        {error && !beneficiary && (
          <div className="mt-6 text-center text-red-600 bg-red-50 p-4 rounded-lg">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para mostrar la tarjeta de resultado del afiliado
const BeneficiaryResultCard = ({ beneficiary, onSelect }) => {
  const statusInfo = beneficiary.activo
    ? { text: 'Activo', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' }
    : { text: 'Inactivo', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' };

  // Lógica para determinar el plan del beneficiario
  const planInfo = useMemo(() => {
    if (!beneficiary?.fSssTipoDeBeneficiario?.nombre) {
      return { plan: 'No especificado', color: 'text-gray-500' };
    }
    const esRelacionDependencia = beneficiary.fSssTipoDeBeneficiario.nombre.toLowerCase().includes('relacion de dependencia');
    return esRelacionDependencia ? { plan: 'PLATINO', color: 'text-green-600 font-bold' } : { plan: 'BORDO', color: 'text-yellow-600 font-bold' };
  }, [beneficiary]);

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md border-l-4 ${statusInfo.borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{beneficiary.nombre}</h3>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
            {beneficiary.activo ? <CheckCircleSolidIcon className="w-5 h-5 mr-1.5" /> : <XCircleIcon className="w-5 h-5 mr-1.5" />}
            {statusInfo.text}
          </span>
          {onSelect && (
            <button
              onClick={() => onSelect(beneficiary)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Ver Perfil Completo
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
        <p><strong className="font-medium text-gray-800">CUIL:</strong> {beneficiary.cuil}</p>
        <p><strong className="font-medium text-gray-800">Documento:</strong> {beneficiary.numeroDeDocumento}</p>
        <p><strong className="font-medium text-gray-800">Plan:</strong> <span className={planInfo.color}>{planInfo.plan}</span></p>
        <p><strong className="font-medium text-gray-800">Fecha de Nacimiento:</strong> {new Date(beneficiary.fechaNacimiento).toLocaleDateString('es-ES')}</p>
        <p><strong className="font-medium text-gray-800">Parentesco:</strong> {beneficiary.fSssParentesco?.nombre}</p>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState(null);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "La solicitud INT-7650 ha sido aprobada.", time: "hace 5 minutos", read: false },
    { id: 2, text: "Nueva documentación adjunta en PRO-2344.", time: "hace 1 hora", read: false },
    { id: 3, text: "El sistema estará en mantenimiento esta noche a las 2 AM.", time: "hace 3 horas", read: true },
  ]);

  // Estados para modales de detalles
  const [internmentDetailModal, setInternmentDetailModal] = useState({ isOpen: false, request: null });
  const [medicationDetailModal, setMedicationDetailModal] = useState({ isOpen: false, request: null });
  const [authorizationDetailModal, setAuthorizationDetailModal] = useState({ isOpen: false, request: null });
  
  // Estado para modal de búsqueda de beneficiarios
  const [searchBeneficiaryModal, setSearchBeneficiaryModal] = useState({ isOpen: false, searchTerm: '', results: [] });

  // Mock data para beneficiarios (en producción esto vendría de una API)
  const beneficiariesData = {
    1: {
      id: 1, 
      name: 'Juan Pérez', 
      cuil: '20404803574',
      memberId: '20404803574/00', 
      dob: '1980-03-15', 
      sex: 'Masculino',
      phone: '11-5555-1234', 
      email: 'juan.perez@email.com',
      address: 'Av. Corrientes 1234, 5A',
      province: 'CABA',
      beneficiaryType: 'Relación de Dependencia', 
      hasDisability: true, 
      reviewStatus: 'Al día', 
      status: 'Activo', 
      planType: 'Platino',
      internalProfile: 'Paciente con hipertensión arterial crónica. Requiere control periódico de presión y medicación regular (Losartan). Alergia a la penicilina.',
      chronicConditions: ['Hipertensión Arterial', 'Alergia a Penicilina'],
      chronicMedication: ['Losartan 50mg', 'Aspirina Prevent 100mg'],
      history: [
        { id: 'INT-7651', type: 'Internación', date: '2024-07-29', description: 'Cirugía de apéndice', provider: 'Hospital Central', status: 'Requiere Auditoría' },
        { id: 'PRA-4532', type: 'Prácticas', date: '2024-07-28', description: 'Análisis de sangre completo.', provider: 'Centro de Diagnóstico', status: 'Aprobado' },
        { id: 'MED-9870', type: 'Medicación', date: '2024-07-05', description: 'Losartan 50mg x 30', provider: 'Farmacia del Sol', status: 'Aprobado' },
        { id: 'MED-9865', type: 'Medicación', date: '2024-06-05', description: 'Losartan 50mg x 30', provider: 'Farmacia del Sol', status: 'Aprobado' },
        { id: 'PRO-2340', type: 'Prótesis', date: '2024-05-15', description: 'Tornillos para fractura', provider: 'OrtoSalud S.A.', status: 'Aprobado' },
      ]
    },
    2: {
      id: 2, 
      name: 'Ana Gómez', 
      cuil: '27954567891',
      memberId: '27954567891/00', 
      dob: '1995-08-20', 
      sex: 'Femenino',
      phone: '11-5555-5678', 
      email: 'ana.gomez@email.com',
      address: 'Calle Falsa 123',
      province: 'Buenos Aires',
      beneficiaryType: 'Monotributo', 
      hasDisability: false, 
      reviewStatus: 'Pago pendiente', 
      status: 'Activo', 
      planType: 'Bordo',
      internalProfile: '',
      chronicConditions: [],
      chronicMedication: [],
      history: [
        { id: 'PRO-2345', type: 'Prótesis', date: '2024-07-29', description: 'Prótesis de rodilla', provider: 'OrtoSalud S.A.', status: 'Pendiente' }
      ]
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/autorizaciones/internas');
      if (!response.ok) {
        throw new Error('Error al cargar datos del dashboard');
      }
      const data = await response.json();
      
      // Transformar datos para el dashboard
      const transformedRequests = data.map(item => ({
        id: item.id,
        type: item.type,
        beneficiaryId: Math.floor(Math.random() * 2) + 1, // Mock ID
        beneficiary: item.beneficiary,
        provider: item.provider_name || 'N/A',
        date: new Date().toISOString(), // Mock date
        status: item.status
      }));
      
      setRequests(transformedRequests);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    pending: requests.length,
    internaciones: requests.filter(r => r.type === 'Internación').length,
    auditoria: requests.filter(r => r.status === 'Requiere Auditoría' || r.status === 'En Auditoría').length,
    notificaciones: notifications.filter(n => !n.read).length,
  }), [requests, notifications]);

  const handleOpenProfile = (beneficiaryId) => {
    setSelectedBeneficiaryId(beneficiaryId);
  };

  const handleCloseProfile = () => {
    setSelectedBeneficiaryId(null);
  };

  const handleCloseInternmentDetail = () => {
    setInternmentDetailModal({ isOpen: false, request: null });
  };

  const handleCloseMedicationDetail = () => {
    setMedicationDetailModal({ isOpen: false, request: null });
  };

  const handleCloseAuthorizationDetail = () => {
    setAuthorizationDetailModal({ isOpen: false, request: null });
  };

  const handleCloseSearchBeneficiary = () => {
    setSearchBeneficiaryModal({ isOpen: false, searchTerm: '', results: [] });
  };

  const handleSelectBeneficiary = (beneficiary) => {
    // Usar el beneficiario real de la API en lugar de mock data
    setSelectedBeneficiaryId(beneficiary);
    setSearchBeneficiaryModal({ isOpen: false, searchTerm: '', results: [] });
    toast.success(`Perfil de ${beneficiary.nombre} cargado`);
  };

  const handleViewDetails = (request) => {
    // Determinar qué modal abrir según el tipo de solicitud
    switch (request.type) {
      case 'Internación':
        setInternmentDetailModal({ isOpen: true, request: request });
        break;
      case 'Medicación':
        setMedicationDetailModal({ isOpen: true, request: request });
        break;
      case 'Prácticas':
      case 'Prótesis':
      case 'Traslado':
        setAuthorizationDetailModal({ isOpen: true, request: request });
        break;
      default:
        toast.info(`Ver detalles de ${request.type} #${request.id}`);
        break;
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new-auth':
        // Navegar a la página de autorizaciones
        window.location.href = '/autorizaciones';
        break;
      case 'search-beneficiary':
        // Abrir modal de búsqueda de beneficiario
        setSearchBeneficiaryModal({ isOpen: true, searchTerm: '', results: [] });
        break;
      case 'reports':
        // Navegar a página de reportes
        toast.info('Página de reportes en desarrollo');
        break;
      default:
        toast.info('Acción no implementada');
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Main Content */}
      <main className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Solicitudes Pendientes" 
            value={stats.pending} 
            icon={PlusIcon}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard 
            title="Internaciones Pendientes" 
            value={stats.internaciones} 
            icon={HeartSolidIcon}
            color="text-red-600"
            bgColor="bg-red-100"
          />
          <StatCard 
            title="Requieren Auditoría" 
            value={stats.auditoria} 
            icon={UserPlusIcon}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
          <StatCard 
            title="Nuevas Notificaciones" 
            value={stats.notificaciones} 
            icon={BellIcon}
            color="text-green-600"
            bgColor="bg-green-100"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Table Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Solicitudes Pendientes de Gestión</h2>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Solicitud
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Beneficiario
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prestador
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Ver</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map(req => (
                    <RequestRow 
                      key={req.id} 
                      request={req} 
                      onBeneficiaryClick={handleOpenProfile}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-4">Atajos Rápidos</h2>
              <div className="space-y-3">
                <QuickActionButton 
                  text="Nueva Autorización" 
                  icon={PlusIcon}
                  onClick={() => handleQuickAction('new-auth')}
                />
                <QuickActionButton 
                  text="Buscar Beneficiario" 
                  icon={UserPlusIcon}
                  onClick={() => handleQuickAction('search-beneficiary')}
                />
                <QuickActionButton 
                  text="Ver Reportes" 
                  icon={ChartBarIcon}
                  onClick={() => handleQuickAction('reports')}
                />
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-4">Últimas Notificaciones</h2>
              <ul className="space-y-4">
                {notifications.map(n => (
                  <li key={n.id} className="flex space-x-3">
                    <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
    <div>
                      <p className={`text-sm ${n.read ? 'text-gray-500' : 'text-gray-800 font-semibold'}`}>
                        {n.text}
                      </p>
                      <p className="text-xs text-gray-400">{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Beneficiary Profile Modal */}
      {selectedBeneficiaryId && (
        <BeneficiaryProfileModal 
          beneficiary={typeof selectedBeneficiaryId === 'object' ? selectedBeneficiaryId : beneficiariesData[selectedBeneficiaryId]} 
          onClose={handleCloseProfile} 
        />
      )}

      {/* Modales de detalles */}
      {internmentDetailModal.isOpen && (
        <InternmentDetailModal
          request={internmentDetailModal.request}
          onClose={handleCloseInternmentDetail}
          userRole={session?.user?.role}
          onSuccess={() => {
            handleCloseInternmentDetail();
            fetchDashboardData();
          }}
        />
      )}
      {medicationDetailModal.isOpen && (
        <MedicationDetailModal
          request={medicationDetailModal.request}
          onClose={handleCloseMedicationDetail}
          onSuccess={() => {
            handleCloseMedicationDetail();
            fetchDashboardData();
          }}
        />
      )}
      {authorizationDetailModal.isOpen && (
        <AuthorizationForm
          isOpen={authorizationDetailModal.isOpen}
          onClose={handleCloseAuthorizationDetail}
          mode="view"
          data={authorizationDetailModal.request}
        />
      )}

      {/* Modal de búsqueda de beneficiarios */}
      {searchBeneficiaryModal.isOpen && (
        <SearchBeneficiaryModal
          isOpen={searchBeneficiaryModal.isOpen}
          onClose={handleCloseSearchBeneficiary}
          onSelectBeneficiary={handleSelectBeneficiary}
        />
      )}
    </div>
  );
} 