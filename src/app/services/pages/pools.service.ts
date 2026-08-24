import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ConfirmPaymentReq } from '@app/models/confirm-payment-req';
import { ConfirmPaymentRes } from '@app/models/confirm-payment-res';
import { CreateDrawReq } from '@app/models/create-draw-req';
import { CreateDrawRes } from '@app/models/create-draw-res';
import { CreatePoolReq } from '@app/models/create-pool-req';
import { CreatePoolRes } from '@app/models/create-pool-res';
import { GetMonthPaymentsRes, MonthPaymentRes } from '@app/models/get-month-payments-res';
import { GetMyPaymentsRes, MyPaymentRes } from '@app/models/get-my-payments-res';
import { GetOrderRes } from '@app/models/get-order-res';
import { GetParticipantsRes } from '@app/models/get-participants-res';
import { GetPoolInvitationRes } from '@app/models/get-pool-invitation-res';
import { GetPoolRes } from '@app/models/get-pool-res';
import { GetReminderRes } from '@app/models/get-reminder-res';
import { JoinPoolReq } from '@app/models/join-pool-req';
import { JoinPoolRes } from '@app/models/join-pool-res';
import { MarkPaidReq } from '@app/models/mark-paid-req';
import { MarkPaidRes } from '@app/models/mark-paid-res';
import { ParticipantRes } from '@app/models/participant-res';
import { TurnRes } from '@app/models/turn-res';
import { environment } from '@env/environment';

/**
 * Cliente del recurso `pools` de la API REST.
 */
@Injectable({ providedIn: 'root' })
export class PoolsService {
  private static readonly BASE_URL = `${environment.AHORRACO_REST_API_URL}/pools`;

  private readonly http = inject(HttpClient);

  createPool(request: CreatePoolReq): Observable<CreatePoolRes> {
    return this.http.post<CreatePoolRes>(PoolsService.BASE_URL, request);
  }

  getPool(poolId: string): Observable<GetPoolRes> {
    return this.http.get<GetPoolRes>(`${PoolsService.BASE_URL}/${poolId}`);
  }

  getPoolByInvitation(invitationToken: string): Observable<GetPoolInvitationRes> {
    return this.http.get<GetPoolInvitationRes>(
      `${PoolsService.BASE_URL}/invitation/${invitationToken}`
    );
  }

  getParticipants(poolId: string): Observable<ParticipantRes[]> {
    return this.http
      .get<GetParticipantsRes>(`${PoolsService.BASE_URL}/${poolId}/participants`)
      .pipe(map((response) => response.participants));
  }

  joinPool(poolId: string, request: JoinPoolReq): Observable<JoinPoolRes> {
    return this.http.post<JoinPoolRes>(`${PoolsService.BASE_URL}/${poolId}/participants`, request);
  }

  /**
   * Obtener orden de cobro.
   */
  getOrder(poolId: string): Observable<GetOrderRes> {
    return this.http.get<GetOrderRes>(`${PoolsService.BASE_URL}/${poolId}/order`);
  }

  /**
   * Sortear orden de cobro.
   */
  createDraw(poolId: string, request: CreateDrawReq): Observable<TurnRes[]> {
    return this.http
      .post<CreateDrawRes>(`${PoolsService.BASE_URL}/${poolId}/draw`, request)
      .pipe(map((response) => response.turns));
  }

  /**
   * Obtener cuotas registradas del participante.
   */
  getMyPayments(poolId: string, participantPublicId: string): Observable<MyPaymentRes[]> {
    return this.http
      .get<GetMyPaymentsRes>(
        `${PoolsService.BASE_URL}/${poolId}/payments/participant/${participantPublicId}`
      )
      .pipe(map((response) => response.payments));
  }

  /**
   * Establecer cuota como pagada por parte del participante.
   */
  markPaid(poolId: string, request: MarkPaidReq): Observable<MarkPaidRes> {
    return this.http.post<MarkPaidRes>(
      `${PoolsService.BASE_URL}/${poolId}/payments/mark-paid`,
      request
    );
  }

  /**
   * Obtener las cuotas del mes seleccionado.
   */
  getMonthPayments(poolId: string, month: string): Observable<MonthPaymentRes[]> {
    return this.http
      .get<GetMonthPaymentsRes>(`${PoolsService.BASE_URL}/${poolId}/payments`, {
        params: new HttpParams().set('month', month)
      })
      .pipe(map((response) => response.payments));
  }

  /**
   * Establecer cuota como pagada y confirmada por parte del organizador.
   */
  confirmReceived(poolId: string, request: ConfirmPaymentReq): Observable<ConfirmPaymentRes> {
    return this.http.post<ConfirmPaymentRes>(
      `${PoolsService.BASE_URL}/${poolId}/payments/confirm-received`,
      request
    );
  }

  /**
   * Obtener mensajes del recordatorio de la porra.
   */
  getReminder(poolId: string, month: string): Observable<GetReminderRes> {
    return this.http.get<GetReminderRes>(`${PoolsService.BASE_URL}/${poolId}/reminder`, {
      params: new HttpParams().set('month', month)
    });
  }
}
