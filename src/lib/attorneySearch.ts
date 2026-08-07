import { Attorney } from '@/types/attorney';
import {
  ATTORNEY_SEARCH_URL,
  ATTORNEY_REQUEST_TIMEOUT,
} from '@/config/attorneyApi';
import { bearerHeaders } from '@/config/api';
import { authErrorMessage } from '@/lib/authApi';

interface AttorneyOut {
  registration_number: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  post_nominal?: string | null;
  firm_name?: string | null;
  firm_name_line2?: string | null;
  street_address_1?: string | null;
  street_address_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  status?: string | null;
}

function mapAttorney(a: AttorneyOut): Attorney {
  const nameParts = [a.first_name, a.middle_name, a.last_name, a.post_nominal].filter(Boolean);
  const addressParts = [
    a.street_address_1,
    a.street_address_2,
    a.city,
    a.state,
    a.postal_code,
    a.country,
  ].filter(Boolean);
  return {
    regNumber: a.registration_number,
    name: nameParts.join(' '),
    firstName: a.first_name ?? undefined,
    middleName: a.middle_name ?? undefined,
    lastName: a.last_name ?? undefined,
    phone: a.phone ?? undefined,
    address: addressParts.length ? addressParts.join(', ') : undefined,
  };
}

async function searchRemote(query: string): Promise<Attorney[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ATTORNEY_REQUEST_TIMEOUT);
  try {
    const url = `${ATTORNEY_SEARCH_URL}?q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { method: 'GET', headers: bearerHeaders(), signal: controller.signal });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error(await authErrorMessage(res));
      throw new Error(`Attorney search failed: ${res.status}`);
    }
    const data: AttorneyOut[] = await res.json();
    return Array.isArray(data) ? data.map(mapAttorney) : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export function searchAttorneys(query: string): Promise<Attorney[]> {
  if (!query.trim()) return Promise.resolve([]);
  return searchRemote(query);
}
