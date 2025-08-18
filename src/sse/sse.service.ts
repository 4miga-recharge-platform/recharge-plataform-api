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
export class SseService {
  private emailVerifiedSubject = new Subject<EmailVerifiedEvent>();

  // Observable for clients to subscribe
  getEmailVerifiedEvents(): Observable<EmailVerifiedEvent> {
    return this.emailVerifiedSubject.asObservable();
  }

  // Method to notify when email is verified
  notifyEmailVerified(email: string, userData: any) {
    console.log('SseService: Creating event for email:', email);
    const event: EmailVerifiedEvent = {
      email,
      userData,
      timestamp: new Date().toISOString(),
    };
    console.log('SseService: Emitting event:', event);
    this.emailVerifiedSubject.next(event);
  }
}
