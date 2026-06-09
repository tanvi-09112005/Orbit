import { create } from 'zustand'

export const useUIStore = create((set) => ({
  // Toast state
  toasts: [],
  addToast: (message, variant = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: Date.now(), message, variant }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // Bottom sheets
  bottomSheets: {
    addTask: false,
    addEvent: false,
    moodCheckIn: false,
    addChild: false,
    inviteMember: false,
    addHomework: false,
    addExam: false,
    addPTM: false,
    addActivity: false,
    addNote: false,
  },

  toggleBottomSheet: (name, open) =>
    set((state) => ({
      bottomSheets: {
        ...state.bottomSheets,
        [name]: open !== undefined ? open : !state.bottomSheets[name],
      },
    })),

  // Install prompt
  installPrompt: null,
  setInstallPrompt: (prompt) => set({ installPrompt: prompt }),
}))
