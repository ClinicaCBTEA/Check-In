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

export async function fetchQueue() {
  return apiCall<any[]>('/queue');
}

export async function addPatientToQueue(patientName: string, phone: string) {
  return apiCall<any>('/queue', {
    method: 'POST',
    body: JSON.stringify({ patientName, phone }),
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

export async function fetchCurrentPatient() {
  return apiCall<any | null>('/current-patient');
}

export async function setCurrentPatient(patient: any) {
  return apiCall<any>('/current-patient', {
    method: 'POST',
    body: JSON.stringify({ patient }),
  });
}

// ============ RECEPTIONIST API ============

export async function fetchReceptionists() {
  return apiCall<any[]>('/receptionists');
}

export async function addReceptionist(name: string, username: string, password: string) {
  return apiCall<any>('/receptionists', {
    method: 'POST',
    body: JSON.stringify({ name, username, password }),
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
