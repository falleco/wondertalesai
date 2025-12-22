import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { type AppConfigurationType } from '@server/config/configuration';
import { Job } from 'bullmq';
import { Queues, SendEmailPayload } from '../queues';

@Processor(Queues.EMAIL)
export class EmailConsumer extends WorkerHost {
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService<AppConfigurationType>,
  ) {
    super();
  }

  private getEmailConfig() {
    return this.configService.get<AppConfigurationType['email']>('email');
  }

  private initSendgrid() {
    if (this.isInitialized) {
      return true;
    }
    const emailConfig = this.getEmailConfig();
    if (!emailConfig?.apiKey) {
      return false;
    }
    sgMail.setApiKey(emailConfig.apiKey);
    this.isInitialized = true;
    return true;
  }

  async process(job: Job<SendEmailPayload, unknown, string>): Promise<unknown> {
    if (!this.initSendgrid()) {
      return { skipped: true };
    }
    const emailConfig = this.getEmailConfig();
    if (!emailConfig?.fromEmail) {
      throw new Error('Config key missing: email.fromEmail');
    }
    const fromName = emailConfig.fromName;

    await sgMail.send({
      to: job.data.to,
      from: fromName
        ? { email: emailConfig.fromEmail, name: fromName }
        : emailConfig.fromEmail,
      templateId: job.data.templateId,
      dynamicTemplateData: job.data.payload,
    });

    return { sent: true };
  }
}
