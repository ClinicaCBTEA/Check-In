import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as api from '../../utils/api';
import { useAuth } from './AuthContext';

export interface CallHistory {
  calledTime: Date;
  calledBy: string;
  returnedTime?: Date;
}

export interface QueueEntry {
  id: string;
  patientName: string;
  phone: string;
  unitId: string;
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
  /** Primeiro paciente “em atendimento” entre as chaves por unidade (útil para debug). */
  currentPatient: QueueEntry | null;
  currentByUnit: Record<string, QueueEntry | null>;
  addToQueue: (patientName: string, phone: string, unitId: string) => Promise<string>;
  callNext: (receptionistName: string) => Promise<void>;
  callSpecificPatient: (patientId: string, receptionistName: string) => Promise<void>;
  completeService: (patientId: string) => Promise<void>;
  returnToQueue: (patientId: string) => Promise<void>;
  moveToFront: (patientId: string) => Promise<void>;
  getPatientPosition: (id: string, unitId?: string) => number | null;
  getLogEntries: () => QueueEntry[];
  refreshQueue: () => Promise<void>;
}

const SimpleQueueContext = createContext<SimpleQueueContextType | undefined>(undefined);

function parseQueueEntry(entry: any): QueueEntry {
  return {
    ...entry,
    unitId: entry.unitId || 'unidadebarra',
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

async function loadCurrentByUnit(unitIds: string[]): Promise<Record<string, QueueEntry | null>> {
  const out: Record<string, QueueEntry | null> = {};
  await Promise.all(
    unitIds.map(async (uid) => {
      try {
        const p = await api.fetchCurrentPatient(uid);
        out[uid] = p ? parseQueueEntry(p) : null;
      } catch {
        out[uid] = null;
      }
    })
  );
  return out;
}

function firstCurrentPatient(map: Record<string, QueueEntry | null>): QueueEntry | null {
  for (const v of Object.values(map)) {
    if (v) {
      return v;
    }
  }
  return null;
}

export function SimpleQueueProvider({ children }: { children: ReactNode }) {
  const { receptionist } = useAuth();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentByUnit, setCurrentByUnit] = useState<Record<string, QueueEntry | null>>({});
  const [currentPatient, setCurrentPatient] = useState<QueueEntry | null>(null);

  const refreshQueue = useCallback(async () => {
    try {
      const unitsFilter =
        receptionist?.unitIds && receptionist.unitIds.length > 0
          ? receptionist.unitIds
          : undefined;

      const queueData = await api.fetchQueue(unitsFilter);

      let currentMap: Record<string, QueueEntry | null> = {};
      if (receptionist?.unitIds && receptionist.unitIds.length > 0) {
        currentMap = await loadCurrentByUnit(receptionist.unitIds);
      }

      const parsedQueue = queueData.map(parseQueueEntry);
      parsedQueue.sort((a, b) => a.checkInTime.getTime() - b.checkInTime.getTime());
      setQueue(parsedQueue);
      setCurrentByUnit(currentMap);
      setCurrentPatient(firstCurrentPatient(currentMap));

      localStorage.setItem('queue_backup', JSON.stringify(parsedQueue));
      localStorage.setItem('currentPatient_by_unit_backup', JSON.stringify(currentMap));
    } catch (error) {
      console.error('Error fetching queue from server:', error);
      console.warn('🚨 Servidor não disponível - usando dados locais');

      const queueBackup = localStorage.getItem('queue_backup');
      const currentBackup = localStorage.getItem('currentPatient_by_unit_backup');

      if (queueBackup) {
        try {
          const parsedBackup = JSON.parse(queueBackup).map(parseQueueEntry);
          setQueue(parsedBackup);
        } catch (e) {
          console.error('Error parsing queue backup:', e);
        }
      }

      if (currentBackup && currentBackup !== 'null') {
        try {
          const raw = JSON.parse(currentBackup) as Record<string, any>;
          const parsed: Record<string, QueueEntry | null> = {};
          for (const k of Object.keys(raw)) {
            parsed[k] = raw[k] ? parseQueueEntry(raw[k]) : null;
          }
          setCurrentByUnit(parsed);
          setCurrentPatient(firstCurrentPatient(parsed));
        } catch (e) {
          console.error('Error parsing current patient backup:', e);
        }
      }
    }
  }, [receptionist?.unitIds, receptionist?.id]);

  useEffect(() => {
    refreshQueue();
    const interval = setInterval(refreshQueue, 3000);
    return () => clearInterval(interval);
  }, [refreshQueue]);

  const addToQueue = async (patientName: string, phone: string, unitId: string): Promise<string> => {
    try {
      const newEntry = await api.addPatientToQueue(patientName, phone, unitId);
      await refreshQueue();
      return newEntry.id;
    } catch (error) {
      console.warn('Server unavailable, using local mode');

      const id = `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newEntry: QueueEntry = {
        id,
        patientName,
        phone,
        unitId,
        checkInTime: new Date(),
        position: queue.length + 1,
        status: 'waiting',
        callHistory: [],
      };

      const updatedQueue = [...queue, newEntry];
      setQueue(updatedQueue);
      localStorage.setItem('queue_backup', JSON.stringify(updatedQueue));

      return id;
    }
  };

  const callNext = async (receptionistName: string): Promise<void> => {
    try {
      const waitingPatients = queue.filter((p) => p.status === 'waiting');
      if (waitingPatients.length > 0) {
        const nextPatient = waitingPatients[0];
        const unitId = nextPatient.unitId;
        const callTime = new Date();
        const newCallHistory: CallHistory = {
          calledTime: callTime,
          calledBy: receptionistName,
        };
        const updates = {
          calledTime: callTime.toISOString(),
          calledBy: receptionistName,
          status: 'in-service',
          callHistory: [
            ...(nextPatient.callHistory || []),
            {
              calledTime: callTime.toISOString(),
              calledBy: receptionistName,
            },
          ],
        };

        await api.updateQueueEntry(nextPatient.id, updates);

        const updatedPatient = {
          ...nextPatient,
          ...updates,
          callHistory: [...(nextPatient.callHistory || []), newCallHistory],
        };
        await api.setCurrentPatient(updatedPatient, unitId);
        await refreshQueue();
      }
    } catch (error) {
      console.error('Error calling next patient:', error);
      throw error;
    }
  };

  const callSpecificPatient = async (patientId: string, receptionistName: string): Promise<void> => {
    try {
      const patient = queue.find((p) => p.id === patientId && p.status === 'waiting');
      if (patient) {
        const unitId = patient.unitId;
        const callTime = new Date();
        const newCallHistory: CallHistory = {
          calledTime: callTime,
          calledBy: receptionistName,
        };
        const updates = {
          calledTime: callTime.toISOString(),
          calledBy: receptionistName,
          status: 'in-service',
          callHistory: [
            ...(patient.callHistory || []),
            {
              calledTime: callTime.toISOString(),
              calledBy: receptionistName,
            },
          ],
        };

        await api.updateQueueEntry(patientId, updates);

        const updatedPatient = {
          ...patient,
          ...updates,
          callHistory: [...(patient.callHistory || []), newCallHistory],
        };
        await api.setCurrentPatient(updatedPatient, unitId);
        await refreshQueue();
      }
    } catch (error) {
      console.error('Error calling specific patient:', error);
      throw error;
    }
  };

  const completeService = async (patientId: string): Promise<void> => {
    try {
      const patient = queue.find((p) => p.id === patientId && p.status === 'in-service');
      if (patient) {
        const completedTime = new Date();
        const updates = {
          completedTime: completedTime.toISOString(),
          status: 'completed',
        };

        await api.updateQueueEntry(patientId, updates);

        const uid = patient.unitId;
        if (currentByUnit[uid]?.id === patientId) {
          await api.setCurrentPatient(null, uid);
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
      const patient = queue.find(
        (p) => p.id === patientId && (p.status === 'in-service' || p.status === 'completed')
      );
      if (patient) {
        const updatedHistory = [...(patient.callHistory || [])];
        if (updatedHistory.length > 0) {
          const lastCall = updatedHistory[updatedHistory.length - 1];
          if (!lastCall.returnedTime) {
            lastCall.returnedTime = new Date();
          }
        }

        const updates = {
          checkInTime: new Date().toISOString(),
          calledTime: undefined,
          calledBy: undefined,
          completedTime: undefined,
          status: 'waiting',
          callHistory: updatedHistory.map((ch) => ({
            ...ch,
            calledTime: ch.calledTime instanceof Date ? ch.calledTime.toISOString() : ch.calledTime,
            returnedTime: ch.returnedTime
              ? ch.returnedTime instanceof Date
                ? ch.returnedTime.toISOString()
                : ch.returnedTime
              : undefined,
          })),
        };

        await api.updateQueueEntry(patientId, updates);

        const uid = patient.unitId;
        if (currentByUnit[uid]?.id === patientId) {
          await api.setCurrentPatient(null, uid);
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
      const patient = queue.find((p) => p.id === patientId && p.status === 'waiting');
      if (patient) {
        const priorityTime = new Date('2000-01-01T00:00:00Z');
        const updates = {
          ...patient,
          checkInTime: priorityTime.toISOString(),
          priorityFlag: true,
        };

        await api.updateQueueEntry(patientId, updates);
        await refreshQueue();
      }
    } catch (error) {
      console.error('Error moving patient to front:', error);

      const patient = queue.find((p) => p.id === patientId && p.status === 'waiting');
      if (patient) {
        const waitingPatients = queue.filter((p) => p.status === 'waiting');
        const otherStatuses = queue.filter((p) => p.status !== 'waiting');
        const reorderedWaiting = [patient, ...waitingPatients.filter((p) => p.id !== patientId)];
        setQueue([...reorderedWaiting, ...otherStatuses]);
        localStorage.setItem('queue_backup', JSON.stringify([...reorderedWaiting, ...otherStatuses]));
      }
    }
  };

  const getPatientPosition = (id: string, unitId?: string): number | null => {
    const uid = unitId || queue.find((p) => p.id === id)?.unitId;
    const waitingPatients = queue.filter((p) => {
      if (p.status !== 'waiting') {
        return false;
      }
      if (uid) {
        return p.unitId === uid;
      }
      return true;
    });
    const patientIndex = waitingPatients.findIndex((p) => p.id === id);
    return patientIndex !== -1 ? patientIndex + 1 : null;
  };

  const getLogEntries = (): QueueEntry[] => {
    return [...queue].sort((a, b) => a.checkInTime.getTime() - b.checkInTime.getTime());
  };

  return (
    <SimpleQueueContext.Provider
      value={{
        queue,
        currentPatient,
        currentByUnit,
        addToQueue,
        callNext,
        callSpecificPatient,
        completeService,
        returnToQueue,
        moveToFront,
        getPatientPosition,
        getLogEntries,
        refreshQueue,
      }}
    >
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
