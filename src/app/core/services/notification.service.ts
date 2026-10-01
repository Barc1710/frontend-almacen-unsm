import { Service } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

export interface ConfirmDialogOptions {
  title: string;
  text: string;
  icon?: SweetAlertIcon;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
  focusCancel?: boolean;
}

@Service()
export class NotificationService {
  toast(title: string, icon: SweetAlertIcon = 'success', timer = 2500): void {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer,
    });
  }

  error(title: string, text: string): void {
    void Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Entendido',
      customClass: {
        confirmButton:
          'bg-unsm-green text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:opacity-95 cursor-pointer',
      },
      buttonsStyling: false,
    });
  }

  confirm(options: ConfirmDialogOptions): Promise<SweetAlertResult<boolean>> {
    return Swal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon ?? 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText ?? 'Confirmar',
      cancelButtonText: options.cancelButtonText ?? 'Cancelar',
      focusCancel: options.focusCancel,
      customClass: {
        confirmButton:
          options.confirmButtonClass ??
          'bg-unsm-green text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-xs transition-colors cursor-pointer',
        cancelButton:
          options.cancelButtonClass ??
          'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm border border-slate-300 ml-2 transition-colors cursor-pointer',
      },
      buttonsStyling: false,
    });
  }
}
