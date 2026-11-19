import { request } from './client';

const preferenceKey = (userUuid: string) => 'ems.organization.last.' + userUuid;

export function rememberedOrganization(userUuid: string): string | null {
 try {
  return localStorage.getItem(preferenceKey(userUuid));
 } catch {
  return null;
 }
}

export function rememberOrganization(userUuid: string, organizationUuid: string) {
 try {
  localStorage.setItem(preferenceKey(userUuid), organizationUuid);
 } catch {
  // The current session can still use the selected organization.
 }
}

export function selectOrganization(uuid: string, signal?: AbortSignal) {
 return request('/auth/organizations/' + encodeURIComponent(uuid) + '/select', { method: 'POST', signal });
}
