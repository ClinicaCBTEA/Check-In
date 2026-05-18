import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

function sortQueueEntries(queueEntries: QueueEntry[]) {
  return [...queueEntries].sort(
    (left, right) => left.checkInTime.getTime() - right.checkInTime.getTime(),
  );
}

function mergeQueueEntry(queueEntries: QueueEntry[], nextEntry: QueueEntry) {
  const existingIndex = queueEntries.findIndex((entry) => entry.id === nextEntry.id);

  if (existingIndex === -1) {
    return sortQueueEntries([...queueEntries, nextEntry]);
  }

  const nextQueue = [...queueEntries];
  nextQueue[existingIndex] = nextEntry;
  return sortQueueEntries(nextQueue);
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
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refreshQueue = useCallback(async () => {
    if (!isAuthenticated || !receptionistToken) {
      refreshPromiseRef.current = null;
      setQueue([]);
      return;
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      const queueData = await api.fetchQueue(receptionistToken);
      setQueue(sortQueueEntries(queueData.map(parseQueueEntry)));
    })();

    refreshPromiseRef.current = refreshPromise;

    try {
      await refreshPromise;
    } finally {
      if (refreshPromiseRef.current === refreshPromise) {
        refreshPromiseRef.current = null;
      }
    }
  }, [isAuthenticated, receptionistToken]);

  const syncQueueEntry = useCallback((entry: api.QueueEntryDTO) => {
    const parsedEntry = parseQueueEntry(entry);
    setQueue((currentQueue) => mergeQueueEntry(currentQueue, parsedEntry));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !receptionistToken) {
      refreshPromiseRef.current = null;
      setQueue([]);
      return;
    }

    const runRefresh = () => {
      if (document.hidden) {
        return;
      }

      refreshQueue().catch((error) => {
        console.error('Error refreshing queue:', error);
      });
    };

    runRefresh();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        runRefresh();
      }
    };

    const interval = window.setInterval(runRefresh, 5000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, receptionistToken, refreshQueue]);

  const addToQueue = async (patientName: string, phone: string, unitId: string) => {
    return api.addPatientToQueue(patientName, phone, unitId);
  };

  const callNext = async (receptionistName: string, unitId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    const updatedEntry = await api.callNextPatient(receptionistName, unitId, receptionistToken);
    syncQueueEntry(updatedEntry);
  };

  const callSpecificPatient = async (patientId: string, receptionistName: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    const updatedEntry = await api.callSpecificPatient(patientId, receptionistName, receptionistToken);
    syncQueueEntry(updatedEntry);
  };

  const completeService = async (patientId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    const updatedEntry = await api.completeQueueService(patientId, receptionistToken);
    syncQueueEntry(updatedEntry);
  };

  const returnToQueue = async (patientId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    const updatedEntry = await api.returnQueueEntry(patientId, receptionistToken);
    syncQueueEntry(updatedEntry);
  };

  const moveToFront = async (patientId: string) => {
    if (!receptionistToken) {
      throw new Error('Reception session not available');
    }

    const updatedEntry = await api.prioritizeQueueEntry(patientId, receptionistToken);
    syncQueueEntry(updatedEntry);
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
    return sortQueueEntries(queue);
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
