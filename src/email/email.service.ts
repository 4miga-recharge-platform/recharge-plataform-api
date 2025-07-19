import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY não está configurada no .env');
      throw new Error('RESEND_API_KEY is required');
    }

    console.log('Inicializando Resend com API key:', apiKey.substring(0, 10) + '...');
    this.resend = new Resend(apiKey);
    // Tentar usar um domínio de teste do Resend
    this.fromEmail = 'noreply@resend.dev';
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
      console.log('Tentando enviar email para:', to);
      console.log('De:', this.fromEmail);
      console.log('Assunto:', subject);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      console.log('Email enviado com sucesso:', result);
      return result;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }
}
