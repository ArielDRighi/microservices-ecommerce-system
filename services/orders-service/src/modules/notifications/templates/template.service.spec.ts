import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import { Language, TemplateType } from '../enums';

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Variable Substitution', () => {
    it('should substitute single variable in template', () => {
      const template = 'Hello {{name}}!';
      const data = { name: 'John' };
      const result = service.render(template, data);
      expect(result).toBe('Hello John!');
    });

    it('should substitute multiple variables in template', () => {
      const template = 'Order {{orderNumber}} for {{customerName}} is confirmed';
      const data = { orderNumber: '12345', customerName: 'Jane Doe' };
      const result = service.render(template, data);
      expect(result).toBe('Order 12345 for Jane Doe is confirmed');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}, your order {{orderNumber}} is ready';
      const data = { name: 'John' };
      const result = service.render(template, data);
      expect(result).toContain('Hello John');
      expect(result).toContain('{{orderNumber}}'); // Should keep placeholder
    });

    it('should handle nested object variables', () => {
      const template = 'Welcome {{user.firstName}} {{user.lastName}}';
      const data = { user: { firstName: 'John', lastName: 'Doe' } };
      const result = service.render(template, data);
      expect(result).toBe('Welcome John Doe');
    });

    it('should handle array index variables', () => {
      const template = 'First item: {{items.0.name}}';
      const data = { items: [{ name: 'Product 1' }, { name: 'Product 2' }] };
      const result = service.render(template, data);
      expect(result).toBe('First item: Product 1');
    });
  });

  describe('Multi-language Support', () => {
    it('should get English template', () => {
      const template = service.getTemplate(TemplateType.ORDER_CONFIRMATION, Language.EN);
      expect(template).toBeDefined();
      expect(template.language).toBe(Language.EN);
      expect(template.subject).toContain('Order Confirmation');
    });

    it('should get Spanish template', () => {
      const template = service.getTemplate(TemplateType.ORDER_CONFIRMATION, Language.ES);
      expect(template).toBeDefined();
      expect(template.language).toBe(Language.ES);
      expect(template.subject).toContain('Confirmación de Pedido');
    });

    it('should fallback to English if language not found', () => {
      // Test with an unsupported language code
      const unsupportedLanguage = 'FR' as Language;
      const template = service.getTemplate(TemplateType.ORDER_CONFIRMATION, unsupportedLanguage);
      expect(template).toBeDefined();
      expect(template.language).toBe(Language.EN);
    });

    it('should render template with correct language', () => {
      const data = { orderNumber: '12345', customerName: 'Juan Pérez' };
      const result = service.renderTemplate(TemplateType.ORDER_CONFIRMATION, data, Language.ES);
      expect(result.subject).toContain('Confirmación');
      expect(result.body).toContain('12345');
      expect(result.body).toContain('Juan Pérez');
    });
  });

  describe('Template Versioning', () => {
    it('should get latest version of template by default', () => {
      const template = service.getTemplate(TemplateType.ORDER_CONFIRMATION, Language.EN);
      expect(template.version).toBeDefined();
      expect(template.version).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning
    });

    it('should get specific version of template', () => {
      const version = '1.0.0';
      const template = service.getTemplate(TemplateType.ORDER_CONFIRMATION, Language.EN, version);
      expect(template.version).toBe(version);
    });

    it('should list all available versions for a template', () => {
      const versions = service.getTemplateVersions(TemplateType.ORDER_CONFIRMATION);
      expect(versions).toBeDefined();
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBeGreaterThan(0);
    });
  });

  describe('HTML Rendering', () => {
    it('should render HTML template correctly', () => {
      const data = {
        orderNumber: '12345',
        customerName: 'John Doe',
        totalAmount: 109.97,
      };

      const result = service.renderTemplate(TemplateType.ORDER_CONFIRMATION, data, Language.EN);

      expect(result.body).toContain('<html');
      expect(result.body).toContain('12345');
      expect(result.body).toContain('John Doe');
      expect(result.body).toContain('109.97');
    });

    it('should escape HTML in user data to prevent XSS', () => {
      const data = {
        orderNumber: '12345',
        customerName: '<script>alert("XSS")</script>',
      };

      const result = service.renderTemplate(TemplateType.ORDER_CONFIRMATION, data, Language.EN);

      expect(result.body).not.toContain('<script>');
      expect(result.body).toContain('&lt;script&gt;');
    });
  });

  describe('Template Validation', () => {
    it('should validate template structure', () => {
      const validTemplate = {
        name: TemplateType.ORDER_CONFIRMATION,
        version: '1.0.0',
        language: Language.EN,
        subject: 'Order Confirmation',
        body: 'Your order {{orderNumber}} is confirmed',
      };

      const isValid = service.validateTemplate(validTemplate);
      expect(isValid).toBe(true);
    });

    it('should reject template with missing required fields', () => {
      const invalidTemplate = {
        name: TemplateType.ORDER_CONFIRMATION,
        version: '1.0.0',
        // Missing language
        subject: 'Order Confirmation',
        body: 'Your order {{orderNumber}} is confirmed',
      };

      const isValid = service.validateTemplate(invalidTemplate);
      expect(isValid).toBe(false);
    });

    it('should detect invalid variable syntax in template', () => {
      const template = 'Hello {{name}, your order {{orderNumber is ready';
      const errors = service.validateTemplateSyntax(template);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
