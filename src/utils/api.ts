import { projectId, publishableKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

export interface UnitDTO {
  id: string;
  slug: string;
  name: string;
  address: string;
  createdAt?: string;
}

export interface ReceptionistDTO {
  id: string;
  name: string;
  username: string;
  unitIds: string[];
  createdAt: string;
}

export interface AuthSessionDTO {
  token: string;
  role: 'admin' | 'receptionist';
  userId: string;
  username: string;
  name?: string;
  unitIds: string[];
  expiresAt: string;
}

export interface QueueEntryDTO {
  id: string;
  patientName: string;
  phone: string;
  unitId: string;
  checkInTime: string;
  calledTime?: string;
  calledBy?: string;
  completedTime?: string;
  position: number;
  status: 'waiting' | 'in-service' | 'completed';
  callHistory: Array<{
    calledTime: string;
    calledBy: string;
    returnedTime?: string;
  }>;
}

export interface PatientTrackingDTO {
  id: string;
  unitId: string;
  status: 'waiting' | 'in-service' | 'completed';
  position: number | null;
  totalWaiting: number;
  checkInTime: string;
  calledTime?: string;
  completedTime?: string;
}

export interface AddPatientResponse {
  id: string;
  unitId: string;
  accessToken: string;
}

export interface AdminCredentialsPreviewDTO {
  username: string;
  passwordConfigured: boolean;
}

function buildHeaders(authToken?: string, extraHeaders?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    apikey: publishableKey,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extraHeaders,
  };
}

async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
  authToken?: string,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(authToken, options?.headers),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message =
      payload?.error ||
      `Server error: ${response.status} ${response.statusText}`;
    throw new Error(message.replace(/^Error:\s*/, ''));
  }

  return payload.data as T;
}

export async function loginReceptionist(username: string, password: string) {
  return apiCall<{
    token: string;
    expiresAt: string;
    receptionist: ReceptionistDTO;
  }>('/auth/reception/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function loginAdmin(username: string, password: string) {
  return apiCall<{
    token: string;
    expiresAt: string;
    admin: {
      username: string;
    };
  }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchSession(authToken: string) {
  return apiCall<AuthSessionDTO>('/auth/session', undefined, authToken);
}

export async function logoutSession(authToken: string) {
  return apiCall<void>(
    '/auth/logout',
    {
      method: 'POST',
    },
    authToken,
  );
}

export async function fetchQueue(authToken: string, unitId?: string) {
  const qs = unitId ? `?unitId=${encodeURIComponent(unitId)}` : '';
  return apiCall<QueueEntryDTO[]>(`/queue${qs}`, undefined, authToken);
}

export async function addPatientToQueue(
  patientName: string,
  phone: string,
  unitId: string,
) {
  return apiCall<AddPatientResponse>('/queue', {
    method: 'POST',
    body: JSON.stringify({ patientName, phone, unitId }),
  });
}

export async function fetchPatientStatus(patientId: string, accessToken: string) {
  return apiCall<PatientTrackingDTO>(
    `/patient/${encodeURIComponent(patientId)}/status`,
    {
      headers: {
        'x-patient-access-token': accessToken,
      },
    },
  );
}

export async function rejoinPatientQueue(patientId: string, accessToken: string) {
  return apiCall<QueueEntryDTO>(`/patient/${encodeURIComponent(patientId)}/rejoin`, {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });
}

export async function callNextPatient(
  receptionistName: string,
  unitId: string,
  authToken: string,
) {
  return apiCall<QueueEntryDTO>(
    '/queue/call-next',
    {
      method: 'POST',
      body: JSON.stringify({ receptionistName, unitId }),
    },
    authToken,
  );
}

export async function callSpecificPatient(
  patientId: string,
  receptionistName: string,
  authToken: string,
) {
  return apiCall<QueueEntryDTO>(
    `/queue/${encodeURIComponent(patientId)}/call`,
    {
      method: 'POST',
      body: JSON.stringify({ receptionistName }),
    },
    authToken,
  );
}

export async function completeQueueService(patientId: string, authToken: string) {
  return apiCall<QueueEntryDTO>(
    `/queue/${encodeURIComponent(patientId)}/complete`,
    {
      method: 'POST',
    },
    authToken,
  );
}

export async function returnQueueEntry(patientId: string, authToken: string) {
  return apiCall<QueueEntryDTO>(
    `/queue/${encodeURIComponent(patientId)}/return`,
    {
      method: 'POST',
    },
    authToken,
  );
}

export async function prioritizeQueueEntry(patientId: string, authToken: string) {
  return apiCall<QueueEntryDTO>(
    `/queue/${encodeURIComponent(patientId)}/prioritize`,
    {
      method: 'POST',
    },
    authToken,
  );
}

export async function deleteQueueEntry(patientId: string, authToken: string) {
  return apiCall<void>(
    `/queue/${encodeURIComponent(patientId)}`,
    {
      method: 'DELETE',
    },
    authToken,
  );
}

export async function fetchUnits() {
  return apiCall<UnitDTO[]>('/units');
}

export async function fetchUnitBySlug(slug: string) {
  return apiCall<UnitDTO>(`/units/by-slug/${encodeURIComponent(slug)}`);
}

export async function createUnit(
  payload: { id?: string; slug: string; name: string; address: string },
  authToken: string,
) {
  return apiCall<UnitDTO>(
    '/units',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    authToken,
  );
}

export async function updateUnit(
  id: string,
  updates: { name?: string; address?: string; slug?: string },
  authToken: string,
) {
  return apiCall<UnitDTO>(
    `/units/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    },
    authToken,
  );
}

export async function deleteUnit(id: string, authToken: string) {
  return apiCall<void>(
    `/units/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
    authToken,
  );
}

export async function fetchReceptionists(authToken: string) {
  return apiCall<ReceptionistDTO[]>('/receptionists', undefined, authToken);
}

export async function addReceptionist(
  name: string,
  username: string,
  password: string,
  unitIds: string[],
  authToken: string,
) {
  return apiCall<ReceptionistDTO>(
    '/receptionists',
    {
      method: 'POST',
      body: JSON.stringify({ name, username, password, unitIds }),
    },
    authToken,
  );
}

export async function updateReceptionist(
  id: string,
  updates: { name?: string; password?: string; unitIds?: string[] },
  authToken: string,
) {
  return apiCall<ReceptionistDTO>(
    `/receptionists/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    },
    authToken,
  );
}

export async function deleteReceptionist(id: string, authToken: string) {
  return apiCall<void>(
    `/receptionists/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
    authToken,
  );
}

export async function fetchAdminCredentials(authToken: string) {
  return apiCall<AdminCredentialsPreviewDTO>('/admin/credentials', undefined, authToken);
}

export async function updateAdminCredentials(
  username: string,
  password: string,
  authToken: string,
) {
  return apiCall<AdminCredentialsPreviewDTO>(
    '/admin/credentials',
    {
      method: 'PUT',
      body: JSON.stringify({ username, password }),
    },
    authToken,
  );
}
