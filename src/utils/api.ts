import { projectId, publishableKey } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`API Call: ${options?.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': publishableKey,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.error('API returned error:', data.error);
      throw new Error(data.error || 'API request failed');
    }

    return data.data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ============ QUEUE API ============

export async function fetchQueue(unitIds?: string[]) {
  const qs =
    unitIds && unitIds.length > 0
      ? `?unitIds=${encodeURIComponent(unitIds.join(','))}`
      : '';
  return apiCall<any[]>(`/queue${qs}`);
}

export async function addPatientToQueue(patientName: string, phone: string, unitId: string) {
  return apiCall<any>('/queue', {
    method: 'POST',
    body: JSON.stringify({ patientName, phone, unitId }),
  });
}

export async function updateQueueEntry(id: string, updates: any) {
  return apiCall<any>(`/queue/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteQueueEntry(id: string) {
  return apiCall<void>(`/queue/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchCurrentPatient(unitId: string) {
  const qs = `?unitId=${encodeURIComponent(unitId)}`;
  return apiCall<any | null>(`/current-patient${qs}`);
}

export async function setCurrentPatient(patient: any | null, unitId: string) {
  return apiCall<any>('/current-patient', {
    method: 'POST',
    body: JSON.stringify({ patient, unitId }),
  });
}

// ============ UNITS API ============

export interface UnitDTO {
  id: string;
  slug: string;
  name: string;
  address: string;
  createdAt?: string;
}

export async function fetchUnits() {
  return apiCall<UnitDTO[]>('/units');
}

export async function fetchUnitBySlug(slug: string) {
  return apiCall<UnitDTO>(`/units/by-slug/${encodeURIComponent(slug)}`);
}

export async function createUnit(payload: { id?: string; slug: string; name: string; address: string }) {
  return apiCall<UnitDTO>('/units', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUnit(id: string, updates: { name?: string; address?: string; slug?: string }) {
  return apiCall<UnitDTO>(`/units/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteUnit(id: string) {
  return apiCall<void>(`/units/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ============ RECEPTIONIST API ============

export async function fetchReceptionists() {
  return apiCall<any[]>('/receptionists');
}

export async function addReceptionist(
  name: string,
  username: string,
  password: string,
  unitIds: string[]
) {
  return apiCall<any>('/receptionists', {
    method: 'POST',
    body: JSON.stringify({ name, username, password, unitIds }),
  });
}

export async function updateReceptionist(
  id: string,
  updates: { name?: string; password?: string; unitIds?: string[] }
) {
  return apiCall<any>(`/receptionists/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteReceptionist(id: string) {
  return apiCall<void>(`/receptionists/${id}`, {
    method: 'DELETE',
  });
}

export async function validateReceptionist(username: string, password: string) {
  return apiCall<any>('/receptionists/validate', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// ============ ADMIN API ============

export async function fetchAdminCredentials() {
  return apiCall<{ username: string; password: string }>('/admin/credentials');
}

export async function updateAdminCredentials(username: string, password: string) {
  return apiCall<{ username: string; password: string }>('/admin/credentials', {
    method: 'PUT',
    body: JSON.stringify({ username, password }),
  });
}

export async function validateAdmin(username: string, password: string) {
  return apiCall<void>('/admin/validate', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}
