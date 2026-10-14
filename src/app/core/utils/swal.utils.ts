/**
 * Clases CSS institucionales reutilizables para SweetAlert2 en el sistema Almacén UNSM.
 */
export const SWAL_CONFIRM_BUTTON_CLASSES =
  'bg-unsm-red text-white px-4 py-2 rounded-lg font-medium hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer mr-2';

export const SWAL_CANCEL_BUTTON_CLASSES =
  'bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-300 active:scale-[0.98] transition-all cursor-pointer';

export const SWAL_BUTTONS_CUSTOM_CLASS = {
  confirmButton: SWAL_CONFIRM_BUTTON_CLASSES,
  cancelButton: SWAL_CANCEL_BUTTON_CLASSES,
} as const;
