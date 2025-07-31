'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  ExclamationTriangleIcon, 
  ClockIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function HighCostAlerts() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    if (!session) return;

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/medication-orders/high-cost/alerts');
        
        if (!response.ok) {
          throw new Error('Error al cargar las alertas');
        }

        const data = await response.json();
        setAlerts(data.alerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Actualizar alertas cada 5 minutos
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session]);

  const dismissAlert = (alertId) => {
    setDismissed(prev => new Set([...prev, alertId]));
  };

  const getAlertType = (alert) => {
    if (alert.type === 'expired') {
      return {
        icon: ExclamationTriangleIcon,
        color: 'bg-red-50 border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-400'
      };
    } else if (alert.type === 'expiring_soon') {
      return {
        icon: ClockIcon,
        color: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-400'
      };
    }
    return {
      icon: ExclamationTriangleIcon,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-400'
    };
  };

  const getAlertMessage = (alert) => {
    switch (alert.type) {
      case 'expired':
        return `La cotización de la orden #${alert.orderId} ha expirado. Se requiere acción inmediata.`;
      case 'expiring_soon':
        return `La cotización de la orden #${alert.orderId} expira en ${alert.timeRemaining}.`;
      default:
        return `Alerta para la orden #${alert.orderId}`;
    }
  };

  if (loading) {
    return null;
  }

  const activeAlerts = alerts.filter(alert => !dismissed.has(alert.id));

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {activeAlerts.map((alert) => {
        const alertConfig = getAlertType(alert);
        const Icon = alertConfig.icon;

        return (
          <div
            key={alert.id}
            className={`border rounded-md p-4 ${alertConfig.color}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Icon className={`w-5 h-5 ${alertConfig.iconColor}`} />
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${alertConfig.textColor}`}>
                  {getAlertMessage(alert)}
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`text-xs ${alertConfig.textColor}`}>
                    Beneficiario: {alert.beneficiaryName}
                  </span>
                  <span className={`text-xs ${alertConfig.textColor}`}>
                    Cotizaciones: {alert.respondedCount}/{alert.totalCount}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className={`inline-flex items-center justify-center rounded-md p-1.5 ${alertConfig.textColor} hover:bg-opacity-20 hover:bg-current focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current`}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 