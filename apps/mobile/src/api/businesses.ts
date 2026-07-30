import { apiRequest } from './client';

export type BusinessVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface MyBusiness {
  id: string;
  name: string;
  verificationStatus: BusinessVerificationStatus;
  places: { id: string; name: string }[];
}

export const businessesApi = {
  mine: () => apiRequest<MyBusiness[]>('/businesses/me', { auth: true }),
  claim: (body: { placeId: string; name: string; evidence: string }) =>
    apiRequest<{ id: string; verificationStatus: BusinessVerificationStatus }>(
      '/businesses/claim',
      { method: 'POST', body, auth: true },
    ),
};

/** Kullanıcı bu noktanın doğrulanmış işletme sahibi mi? */
export function isVerifiedOwner(businesses: MyBusiness[] | undefined, placeId: string) {
  return (
    businesses?.some(
      (b) => b.verificationStatus === 'VERIFIED' && b.places.some((p) => p.id === placeId),
    ) ?? false
  );
}

/** Bu nokta için bekleyen bir sahiplik talebi var mı? */
export function hasPendingClaim(businesses: MyBusiness[] | undefined, placeId: string) {
  return (
    businesses?.some(
      (b) => b.verificationStatus === 'PENDING' && b.places.some((p) => p.id === placeId),
    ) ?? false
  );
}
