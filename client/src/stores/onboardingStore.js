import { create } from 'zustand'

export const useOnboardingStore = create((set) => ({
  familyId: null,
  familyName: '',
  setFamilyId: (id) => set({ familyId: id }),
  setFamilyName: (name) => set({ familyName: name }),
  reset: () => set({ familyId: null, familyName: '' }),
}))