import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../../utils/api';

export interface CallHistory {
  calledTime: Date;
  calledBy: string;
  returnedTime?: Date;
}

export interface QueueEntry {
  id: string;
  patientName: string;
  phone: string;
  checkInTime: Date;
  calledTime?: Date;
  calledBy?: string;
  completedTime?: Date;
  position: number;
  status: 'waiting' | 'in-service' | 'completed';
  callHistory: CallHistory[];
}

interface SimpleQueueContextType {
  queue: QueueEntry[];
  currentPatient: QueueEntry | null;
  addToQueue: (patientName: string, phone: string) => Promise<string>;
  callNext: (receptionistName: string) => Promise<void>;
  callSpecificPatient: (patientId: string, receptionistName: string) => Promise<void>;
  completeService: (patientId: string) => Promise<void>;
  returnToQueue: (patientId: string) => Promise<void>;
  moveToFront: (patientId: string) => Promise<void>;
  getPatientPosition: (id: string) => number | null;
  getLogEntries: () => QueueEntry[];
  refreshQueue: () => Promise<void>;
}

const SimpleQueueContext = createContext<SimpleQueueContextType | undefined>(undefined);

// Convert ISO string dates to Date objects
function parseQueueEntry(entry: any): QueueEntry {
  return {
    ...entry,
    checkInTime: new Date(entry.checkInTime),
    calledTime: entry.calledTime ? new Date(entry.calledTime) : undefined,
    completedTime: entry.completedTime ? new Date(entry.completedTime) : undefined,
    callHistory: (entry.callHistory || []).map((ch: any) => ({
      ...ch,
      calledTime: new Date(ch.calledTime),
      returnedTime: ch.returnedTime ? new Date(ch.returnedTime) : undefined,
    })),
  };
}

export function SimpleQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentPatient, setCurrentPatient] = useState<QueueEntry | null>(null);
  const [isServerAvailable, setIsServerAvailable] = useState(true);

  // Fetch queue from server on mount and set up polling
  useEffect(() => {
    refreshQueue();

    // Poll every 3 seconds for updates
    const interval = setInterval(refreshQueue, 3000);

    return () => clearInterval(interval);
  }, []);

  const refreshQueue = async () => {
    try {
      const [queueData, currentPatientData] = await Promise.all([
        api.fetchQueue(),
        api.fetchCurrentPatient(),
      ]);

      const parsedQueue = queueData.map(parseQueueEntry);
      // Ordenar por checkInTime para manter a ordem correta
      parsedQueue.sort((a, b) => a.checkInTime.getTime() - b.checkInTime.getTime());
      setQueue(parsedQueue);
      setCurrentPatient(currentPatientData ? parseQueueEntry(currentPatientData) : null);
      setIsServerAvailable(true);

      // Save to localStorage as backup
      localStorage.setItem('queue_backup', JSON.stringify(parsedQueue));
      localStorage.setItem('currentPatient_backup', JSON.stringify(currentPatientData));
    } catch (error) {
      console.error('Error fetching queue from server:', error);
      console.warn('🚨 Servidor não disponível - usando dados locais');
      console.info('📋 Para habilitar sincronização, implante o Edge Function do Supabase');
      setIsServerAvailable(false);

      // Load from localStorage as fallback
      const queueBackup = localStorage.getItem('queue_backup');
      const currentPatientBackup = localStorage.getItem('currentPatient_backup');

      if (queueBackup) {
        try {
          const parsedBackup = JSON.parse(queueBackup).map(parseQueueEntry);
          setQueue(parsedBackup);
        } catch (e) {
          console.error('Error parsing queue backup:', e);
        }
      }

      if (currentPatientBackup && currentPatientBackup !== 'null') {
        try {
          setCurrentPatient(parseQueueEntry(JSON.parse(currentPatientBackup)));
        } catch (e) {
          console.error('Error parsing current patient backup:', e);
        }
      }
    }
  };

  const addToQueue = async (patientName: string, phone: string): Promise<string> => {
    try {
      const newEntry = await api.addPatientToQueue(patientName, phone);
      await refreshQueue();
      return newEntry.id;
    } catch (error) {
      console.warn('Server unavailable, using local mode');

      // Fallback to local mode
      const id = `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newEntry: QueueEntry = {
        id,
        patientName,
        phone,
        checkInTime: new Date(),
        position: queue.length + 1,
        status: 'waiting',
        callHistory: []
      };

      const updatedQueue = [...queue, newEntry];
      setQueue(updatedQueue);
      localStorage.setItem('queue_backup', JSON.stringify(updatedQueue));

      return id;
    }
  };

  const callNext = async (receptionistName: string): Promise<void> => {
    try {
      const waitingPatients = queue.filter(p => p.status === 'waiting');
      if (waitingPatients.length > 0) {
        const nextPatient = waitingPatients[0];
        const callTime = new Date();
        const newCallHistory: CallHistory = {
          calledTime: callTime,
          calledBy: receptionistName
        };
        const updates = {
          calledTime: callTime.toISOString(),
          calledBy: receptionistName,
          status: 'in-service',
          callHistory: [...(nextPatient.callHistory || []), {
            calledTime: callTime.toISOString(),
            calledBy: receptionistName
          }]
        };

        await api.updateQueueEntry(nextPatient.id, updates);

        const updatedPatient = { ...nextPatient, ...updates, callHistory: [...(nextPatient.callHistory || []), newCallHistory] };
        await api.setCurrentPatient(updatedPatient);
        await refreshQueue();
      }
    } catch (error) {
      console.error('Error calling next patient:', error);
      throw error;
    }
  };

  const callSpecificPatient = async (patientId: string, receptionistName: string): Promise<void> => {
    try {
      const patient = queue.find(p => p.id === patientId && p.status === 'waiting');
      if (patient) {
        const callTime = new Date();
        const newCallHistory: CallHistory = {
          calledTime: callTime,
          calledBy: receptionistName
        };
        const updates = {
          calledTime: callTime.toISOString(),
          calledBy: receptionistName,
          status: 'in-service',
          callHistory: [...(patient.callHistory || []), {
            calledTime: callTime.toISOString(),
            calledBy: receptionistName
          }]
        };

        await api.updateQueueEntry(patientId, updates);

        const updatedPatient = { ...patient, ...updates, callHistory: [...(patient.callHistory || []), newCallHistory] };
        await api.setCurrentPatient(updatedPatient);
        await refreshQueue();
      }
    } catch (error) {
      console.error('Error calling specific patient:', error);
      throw error;
    }
  };

  const completeService = async (patientId: string): Promise<void> => {
    try {
      const patient = queue.find(p => p.id === patientId && p.status === 'in-service');
      if (patient) {
        const completedTime = new Date();
        const updates = {
          completedTime: completedTime.toISOString(),
          status: 'completed'
        };

        await api.updateQueueEntry(patientId, updates);

        if (currentPatient?.id === patientId) {
          await api.setCurrentPatient(null);
        }

        await refreshQueue();
      }
    } catch (error) {
      console.error('Error completing service:', error);
      throw error;
    }
  };

  const returnToQueue = async (patientId: string): Promise<void> => {
    try {
      const patient = queue.find(p => p.id === patientId && (p.status === 'in-service' || p.status === 'completed'));
      if (patient) {
        const updatedHistory = [...(patient.callHistory || [])];
        if (updatedHistory.length > 0) {
          const lastCall = updatedHistory[updatedHistory.length - 1];
          if (!lastCall.returnedTime) {
            lastCall.returnedTime = new Date();
          }
        }

        // Usar timestamp atual para colocar no final da fila
        const updates = {
          checkInTime: new Date().toISOString(),
          calledTime: undefined,
          calledBy: undefined,
          completedTime: undefined,
          status: 'waiting',
          callHistory: updatedHistory.map(ch => ({
            ...ch,
            calledTime: ch.calledTime instanceof Date ? ch.calledTime.toISOString() : ch.calledTime,
            returnedTime: ch.returnedTime ? (ch.returnedTime instanceof Date ? ch.returnedTime.toISOString() : ch.returnedTime) : undefined
          }))
        };

        await api.updateQueueEntry(patientId, updates);

        if (currentPatient?.id === patientId) {
          await api.setCurrentPatient(null);
        }

        await refreshQueue();
      }
    } catch (error) {
      console.error('Error returning patient to queue:', error);
      throw error;
    }
  };

  const moveToFront = async (patientId: string): Promise<void> => {
    try {
      const patient = queue.find(p => p.id === patientId && p.status === 'waiting');
      if (patient) {
        // Usar timestamp muito antigo para que apareça primeiro ao ordenar por checkInTime
        const priorityTime = new Date('2000-01-01T00:00:00Z');
        const updates = {
          ...patient,
          checkInTime: priorityTime.toISOString(),
          priorityFlag: true
        };

        await api.updateQueueEntry(patientId, updates);
        await refreshQueue();
      }
    } catch (error) {
      console.error('Error moving patient to front:', error);

      // Fallback: reordenar localmente
      const patient = queue.find(p => p.id === patientId && p.status === 'waiting');
      if (patient) {
        const waitingPatients = queue.filter(p => p.status === 'waiting');
        const otherStatuses = queue.filter(p => p.status !== 'waiting');
        const reorderedWaiting = [
          patient,
          ...waitingPatients.filter(p => p.id !== patientId)
        ];
        setQueue([...reorderedWaiting, ...otherStatuses]);
        localStorage.setItem('queue_backup', JSON.stringify([...reorderedWaiting, ...otherStatuses]));
      }
    }
  };

  const getPatientPosition = (id: string): number | null => {
    const waitingPatients = queue.filter(p => p.status === 'waiting');
    const patientIndex = waitingPatients.findIndex(p => p.id === id);
    return patientIndex !== -1 ? patientIndex + 1 : null;
  };

  const getLogEntries = (): QueueEntry[] => {
    return [...queue].sort((a, b) => a.checkInTime.getTime() - b.checkInTime.getTime());
  };

  return (
    <SimpleQueueContext.Provider value={{
      queue,
      currentPatient,
      addToQueue,
      callNext,
      callSpecificPatient,
      completeService,
      returnToQueue,
      moveToFront,
      getPatientPosition,
      getLogEntries,
      refreshQueue
    }}>
      {children}
    </SimpleQueueContext.Provider>
  );
}

export function useSimpleQueue() {
  const context = useContext(SimpleQueueContext);
  if (!context) {
    throw new Error('useSimpleQueue must be used within SimpleQueueProvider');
  }
  return context;
}
