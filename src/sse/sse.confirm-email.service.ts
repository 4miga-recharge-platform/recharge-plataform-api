import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface EmailVerifiedEvent {
  email: string;
  userData: {
    user: any;
    access: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
  timestamp: string;
}

@Injectable()
export class SseConfirmEmailService {
  private emailVerifiedSubject = new Subject<EmailVerifiedEvent>();

  // Observable for clients to subscribe to email verification
  getEmailVerifiedEvents(): Observable<EmailVerifiedEvent> {
    return this.emailVerifiedSubject.asObservable();
  }

  // Method to notify when email is verified
  notifyEmailVerified(email: string, userData: any) {
    console.log('SseConfirmEmailService: Creating event for email:', email);
    const event: EmailVerifiedEvent = {
      email,
      userData,
      timestamp: new Date().toISOString(),
    };
    console.log('SseConfirmEmailService: Emitting event:', event);
    this.emailVerifiedSubject.next(event);
  }
}
