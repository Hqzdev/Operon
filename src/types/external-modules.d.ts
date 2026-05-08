declare module "node-cron" {
  export type ScheduledTask = {
    start(): void;
    stop(): void;
    destroy(): void;
  };

  export function schedule(
    expression: string,
    func: () => void | Promise<void>,
    options?: Record<string, unknown>,
  ): ScheduledTask;

  const cron: { schedule: typeof schedule };
  export default cron;
}

declare module "nodemailer" {
  namespace nodemailer {
    export type MailOptions = {
      from?: string;
      to?: string;
      subject?: string;
      text?: string;
      html?: string;
    };

    export type Transporter = {
      sendMail(options: MailOptions): Promise<unknown>;
    };
  }

  type MailOptions = {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };

  type Transporter = {
    sendMail(options: MailOptions): Promise<unknown>;
  };

  export function createTransport(options: Record<string, unknown>): Transporter;

  const nodemailer: { createTransport: typeof createTransport };
  export default nodemailer;
}
