import { Injectable, Logger } from '@nestjs/common';
import { Language, TemplateType } from '../enums';
import { TemplateConfig, TemplateData } from '../interfaces';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private templates: Map<string, TemplateConfig[]> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Render a template string with variable substitution
   */
  render(template: string, data: TemplateData): string {
    let result = template;

    // Regular expression to match {{variable}} or {{object.property}} or {{array.0}}
    const regex = /\{\{([^}]+)\}\}/g;

    result = result.replace(regex, (match, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? this.escapeHtml(String(value)) : match;
    });

    return result;
  }

  /**
   * Get a specific template by type and language
   */
  getTemplate(type: TemplateType, language: Language, version?: string): TemplateConfig {
    const key = this.getTemplateKey(type, language);
    const templates = this.templates.get(key) || [];

    if (version) {
      const template = templates.find((t) => t.version === version);
      if (template) return template;
    }

    // Return latest version or fallback to English
    if (templates.length > 0) {
      return templates[templates.length - 1]!;
    }

    // Fallback to English
    if (language !== Language.EN) {
      return this.getTemplate(type, Language.EN, version);
    }

    throw new Error(`Template not found: ${type}`);
  }

  /**
   * Render a template with type and language
   */
  renderTemplate(
    type: TemplateType,
    data: TemplateData,
    language: Language = Language.EN,
  ): { subject: string; body: string } {
    const template = this.getTemplate(type, language);

    return {
      subject: this.render(template.subject || '', data),
      body: this.render(template.body, data),
    };
  }

  /**
   * Get all versions of a template
   */
  getTemplateVersions(type: TemplateType): string[] {
    const versions: Set<string> = new Set();

    this.templates.forEach((templates, key) => {
      if (key.startsWith(type)) {
        templates.forEach((t) => versions.add(t.version));
      }
    });

    return Array.from(versions).sort();
  }

  /**
   * Validate template structure
   */
  validateTemplate(template: Partial<TemplateConfig>): boolean {
    return !!(template.name && template.version && template.language && template.body);
  }

  /**
   * Validate template syntax
   */
  validateTemplateSyntax(template: string): string[] {
    const errors: string[] = [];
    const regex = /\{\{([^}]*)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const variable = match[1];

      // Check for unclosed braces
      if (!variable || variable.includes('{{') || variable.includes('}}')) {
        errors.push(`Invalid variable syntax at position ${match.index}`);
      }
    }

    // Check for unmatched opening braces
    const openCount = (template.match(/\{\{/g) || []).length;
    const closeCount = (template.match(/\}\}/g) || []).length;

    if (openCount !== closeCount) {
      errors.push('Unmatched braces in template');
    }

    return errors;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: TemplateData, path: string): unknown {
    const keys = path.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current === 'object' && key in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, (char) => map[char] || char);
  }

  /**
   * Generate template key
   */
  private getTemplateKey(type: TemplateType, language: Language): string {
    return `${type}-${language}`;
  }

  /**
   * Initialize default templates
   */
  private initializeTemplates(): void {
    // Order Confirmation - English
    this.addTemplate({
      name: TemplateType.ORDER_CONFIRMATION,
      version: '1.0.0',
      language: Language.EN,
      subject: 'Order Confirmation #{{orderNumber}}',
      body: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .header { background-color: #4CAF50; color: white; padding: 20px; }
              .content { padding: 20px; }
              .order-details { margin: 20px 0; }
              .item { padding: 10px; border-bottom: 1px solid #ddd; }
              .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Order Confirmation</h1>
            </div>
            <div class="content">
              <p>Dear {{customerName}},</p>
              <p>Thank you for your order! Your order #{{orderNumber}} has been confirmed.</p>
              <div class="order-details">
                <h2>Order Details</h2>
                <div class="total">
                  Total Amount: ${{ totalAmount }}
                </div>
              </div>
              <p>We'll send you another email when your order ships.</p>
              <p>Thank you for shopping with us!</p>
            </div>
          </body>
        </html>
      `,
    });

    // Order Confirmation - Spanish
    this.addTemplate({
      name: TemplateType.ORDER_CONFIRMATION,
      version: '1.0.0',
      language: Language.ES,
      subject: 'Confirmación de Pedido #{{orderNumber}}',
      body: `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .header { background-color: #4CAF50; color: white; padding: 20px; }
              .content { padding: 20px; }
              .order-details { margin: 20px 0; }
              .item { padding: 10px; border-bottom: 1px solid #ddd; }
              .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Confirmación de Pedido</h1>
            </div>
            <div class="content">
              <p>Estimado/a {{customerName}},</p>
              <p>¡Gracias por su pedido! Su orden #{{orderNumber}} ha sido confirmada.</p>
              <div class="order-details">
                <h2>Detalles del Pedido</h2>
                <div class="total">
                  Monto Total: ${{ totalAmount }}
                </div>
              </div>
              <p>Le enviaremos otro correo cuando su pedido sea enviado.</p>
              <p>¡Gracias por comprar con nosotros!</p>
            </div>
          </body>
        </html>
      `,
    });

    // Payment Failure - English
    this.addTemplate({
      name: TemplateType.PAYMENT_FAILURE,
      version: '1.0.0',
      language: Language.EN,
      subject: 'Payment Failed for Order #{{orderNumber}}',
      body: `
        <html>
          <body>
            <h2>Payment Failed</h2>
            <p>Dear {{customerName}},</p>
            <p>Unfortunately, we were unable to process your payment for order #{{orderNumber}}.</p>
            <p><strong>Reason:</strong> {{reason}}</p>
            <p>Please update your payment information and try again.</p>
          </body>
        </html>
      `,
    });

    // Payment Failure - Spanish
    this.addTemplate({
      name: TemplateType.PAYMENT_FAILURE,
      version: '1.0.0',
      language: Language.ES,
      subject: 'Fallo en el Pago del Pedido #{{orderNumber}}',
      body: `
        <html>
          <body>
            <h2>Fallo en el Pago</h2>
            <p>Estimado/a {{customerName}},</p>
            <p>Desafortunadamente, no pudimos procesar su pago para el pedido #{{orderNumber}}.</p>
            <p><strong>Razón:</strong> {{reason}}</p>
            <p>Por favor actualice su información de pago e intente nuevamente.</p>
          </body>
        </html>
      `,
    });

    // Shipping Update - English
    this.addTemplate({
      name: TemplateType.SHIPPING_UPDATE,
      version: '1.0.0',
      language: Language.EN,
      subject: 'Your Order #{{orderNumber}} Has Shipped',
      body: `
        <html>
          <body>
            <h2>Your Order Has Shipped!</h2>
            <p>Dear {{customerName}},</p>
            <p>Great news! Your order #{{orderNumber}} has been shipped.</p>
            <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
            <p>You can track your package using the tracking number above.</p>
          </body>
        </html>
      `,
    });

    // Shipping Update - Spanish
    this.addTemplate({
      name: TemplateType.SHIPPING_UPDATE,
      version: '1.0.0',
      language: Language.ES,
      subject: 'Su Pedido #{{orderNumber}} Ha Sido Enviado',
      body: `
        <html>
          <body>
            <h2>¡Su Pedido Ha Sido Enviado!</h2>
            <p>Estimado/a {{customerName}},</p>
            <p>¡Buenas noticias! Su pedido #{{orderNumber}} ha sido enviado.</p>
            <p><strong>Número de Rastreo:</strong> {{trackingNumber}}</p>
            <p>Puede rastrear su paquete usando el número de rastreo anterior.</p>
          </body>
        </html>
      `,
    });

    // Welcome Email - English
    this.addTemplate({
      name: TemplateType.WELCOME_EMAIL,
      version: '1.0.0',
      language: Language.EN,
      subject: 'Welcome to Our Store!',
      body: `
        <html>
          <body>
            <h2>Welcome {{userName}}!</h2>
            <p>Thank you for joining our community.</p>
            <p>We're excited to have you with us. Start shopping now and enjoy exclusive deals!</p>
          </body>
        </html>
      `,
    });

    // Welcome Email - Spanish
    this.addTemplate({
      name: TemplateType.WELCOME_EMAIL,
      version: '1.0.0',
      language: Language.ES,
      subject: '¡Bienvenido a Nuestra Tienda!',
      body: `
        <html>
          <body>
            <h2>¡Bienvenido {{userName}}!</h2>
            <p>Gracias por unirte a nuestra comunidad.</p>
            <p>Estamos emocionados de tenerte con nosotros. ¡Comienza a comprar ahora y disfruta ofertas exclusivas!</p>
          </body>
        </html>
      `,
    });

    this.logger.log('Templates initialized successfully');
  }

  /**
   * Add a template to the collection
   */
  private addTemplate(template: TemplateConfig): void {
    const key = this.getTemplateKey(template.name as TemplateType, template.language);

    if (!this.templates.has(key)) {
      this.templates.set(key, []);
    }

    this.templates.get(key)!.push(template);
  }
}
