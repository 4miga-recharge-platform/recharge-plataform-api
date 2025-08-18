import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface EmailVerifiedEvent {
  userId: string;
  userData: any;
  timestamp: string;
}

@Injectable()
export class SseService {
  private emailVerifiedSubject = new Subject<EmailVerifiedEvent>();

  // Observable for clients to subscribe
  getEmailVerifiedEvents(): Observable<EmailVerifiedEvent> {
    return this.emailVerifiedSubject.asObservable();
  }

  // Method to notify when email is verified
  notifyEmailVerified(userId: string, userData: any) {
    const event: EmailVerifiedEvent = {
      userId,
      userData,
      timestamp: new Date().toISOString(),
    };
    this.emailVerifiedSubject.next(event);
  }
}
