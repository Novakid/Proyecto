import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable, Subject } from 'rxjs';

@Injectable()
export class DashboardEventsService {
  private readonly updates = new Subject<MessageEvent>();

  stream(): Observable<MessageEvent> {
    const heartbeat = interval(25000).pipe(map(() => ({ type: 'heartbeat', data: '' })));
    return merge(this.updates.asObservable(), heartbeat);
  }

  notifyUpdate(): void {
    this.updates.next({ type: 'dashboard:update', data: { changed: true } });
  }
}
