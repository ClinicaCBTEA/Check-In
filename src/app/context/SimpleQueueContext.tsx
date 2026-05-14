import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  currentPatient: QueueEntry | null;
  currentByUnit: Record<string, QueueEntry | null>;
  addToQueue: (patientName: string, phone: string, unitId: string) => Promise<{ id: string; accessToken: string; unitId: string }>;
  callNext: (receptionistName: string, unitId: string) => Promise<void>;
  callSpecificPatient: (patientId: string, receptionistName: string) => Promise<void>;
  completeService: (patientId: string) => Promise<void>;
  returnToQueue: (patientId: string) => Promise<void>;
  moveToFront: (patientId: string) => Promise<void>;
  getPatientPosition: (id: string, unitId?: string) => number | null;
  getLogEntries: () => QueueEntry[];
  refreshQueue: () => Promise<void>;
}

const SimpleQueueContext = createContext<SimpleQueueContextType | undefined>(undefined);

function parseQueueEntry(entry: api.QueueEntryDTO): QueueEntry {
  return {
    ...entry,
    checkInTime: new Date(entry.checkInTime),
    calledTime: entry.calledTime ? new Date(entry.calledTime) : undefined,
    completedTime: entry.completedTime ? new Date(entry.completedTime) : undefined,
    callHistory: (entry.callHistory || []).map((historyEntry) => ({
      ...historyEntry,
      calledTime: new Date(historyEntry.calledTime),
      returnedTime: historyEntry.returnedTime ? new Date(historyEntry.returnedTime) : undefined,
    })),
  };
}

function deriveCurrentByUnit(queueEntries: QueueEntry[]) {
  const map: Record<string, QueueEntry | null> = {};

  for (const entry of queueEntries) {
    if (entry.status !== 'in-service') {
      continue;
    }

    const existing = map[entry.unitId];
    if (!existing) {
      map[entry.unitId] = entry;
      continue;
    }

    const existingTime = existing.calledTime?.getTime() || existing.checkInTime.getTime();
    const candidateTime = entry.calledTime?.getTime() || entry.checkInTime.getTime();
    if (candidateTime < existingTime) {
      map[entry.unitId] = entry;
    }
  }

  return map;
}

function firstCurrentPatient(map: Record<string, QueueEntry | null>): QueueEntry | null {
  for (const patient of Object.values(map)) {
    if (patient) {
      return patient;
    }
  }

  return null;
}

export function SimpleQueueProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, receptionistToken } = useAuth();
  const [queue, setQueue] = useState<QueueEntry[]>([]);

  const refreshQueue = useCallback(async () => {
    if (!isAuthenticated || !receptionistToken) {
      setQueue([]);
      return;
    }

    const queueData = await api.fetchQueue(receptionistToken);
    const parsedQueue = queueData.map(parseQueueEntry);
    parsedQueue.sort((left, right) => left.checkInTime.getTime() - right.checkInTime.getTime());
    setQueue(parsedQueue);
  }, [isAuthenticated, receptionistToken]);

  useEffect(() => {
    if (!isAuthenticated || !receptionistToken) {
      setQueue([]);
      return;
    }

    refreshQueue().catch((error) => {
      console.error('Error fetching queue from server:', error);
    });

    const interval = window.setInterval(() => {
      refreshQueue().catch((error) => {
        console.error('Error refreshing queue:', error);
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, receptionistToken, refreshQueue]);

  const addToQueue = async (patientName: string, phone: string, unitId: string) => {
    return api.addPatientToQueue(patientName, phone, unitId);
  };

  const callNext = async (receptionistName: string, unitId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    await api.callNextPatient(receptionistName, unitId, receptionistToken);
    await refreshQueue();
  };

  const callSpecificPatient = async (patientId: string, receptionistName: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    await api.callSpecificPatient(patientId, receptionistName, receptionistToken);
    await refreshQueue();
  };

  const completeService = async (patientId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    await api.completeQueueService(patientId, receptionistToken);
    await refreshQueue();
  };

  const returnToQueue = async (patientId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    await api.returnQueueEntry(patientId, receptionistToken);
    await refreshQueue();
  };

  const moveToFront = async (patientId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    await api.prioritizeQueueEntry(patientId, receptionistToken);
    await refreshQueue();
  };

  const getPatientPosition = useCallback(
    (id: string, unitId?: string): number | null => {
      const resolvedUnitId = unitId || queue.find((patient) => patient.id === id)?.unitId;
      const waitingPatients = queue.filter((patient) => {
        if (patient.status !== 'waiting') {
          return false;
        }

        return resolvedUnitId ? patient.unitId === resolvedUnitId : true;
      });
      const patientIndex = waitingPatients.findIndex((patient) => patient.id === id);
      return patientIndex !== -1 ? patientIndex + 1 : null;
    },
    [queue],
  );

  const getLogEntries = useCallback(() => {
    return [...queue].sort((left, right) => left.checkInTime.getTime() - right.checkInTime.getTime());
  }, [queue]);

  const currentByUnit = useMemo(() => deriveCurrentByUnit(queue), [queue]);
  const currentPatient = useMemo(() => firstCurrentPatient(currentByUnit), [currentByUnit]);

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
