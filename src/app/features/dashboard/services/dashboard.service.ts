import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, getApiResponseData } from '../../../core/models';
import { DashboardResumen } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene las métricas ejecutivas, gráficos de tendencia y distribución del almacén.
   * Consume GET /dashboard/resumen
   */
  obtenerResumen(): Observable<DashboardResumen> {
    return this.http
      .get<ApiResponse<DashboardResumen>>(`${this.apiUrl}/dashboard/resumen`)
      .pipe(
        map((res) => {
          const data = getApiResponseData(res);
          if (!data) {
            throw new Error('Respuesta vacía o inválida del servidor');
          }
          return data;
        }),
      );
  }
}
