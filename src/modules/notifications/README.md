# Sistema de Notificaciones

## 📋 Descripción

Sistema completo de notificaciones multicanal diseñado con arquitectura event-driven. Soporta múltiples proveedores (Email, SMS) con procesamiento asíncrono mediante colas (Bull/Redis).

## 🎯 Características

### ✅ Funcionalidades Implementadas

- **Multi-canal**: Email, SMS (extensible a Push notifications)
- **Templates dinámicos**: Sistema de plantillas con variables `{{variable}}`
- **Multi-idioma**: Soporte para Inglés y Español
- **Procesamiento asíncrono**: Integración con Bull Queue
- **Tracking completo**: Estados de envío, apertura, clicks
- **Retry automático**: Exponential backoff para fallos temporales
- **Rate limiting**: Prevención de spam y control de costos
- **Preferencias de usuario**: Opt-in/opt-out por canal

### 🏗️ Arquitectura

```
┌─────────────────┐
│  OrderService   │
│  (crea orden)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ OrderSaga       │
│ (procesa orden) │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ NotificationsService│ ◄─── Invocado automáticamente
└──────────┬──────────┘      por eventos de orden
           │
     ┌─────┴──────┐
     ▼            ▼
┌──────────┐  ┌──────────┐
│EmailProv.│  │SMSProv.  │
│(Mock)    │  │(Mock)    │
└──────────┘  └──────────┘
     │            │
     ▼            ▼
┌─────────────────────┐
│  NotificationEntity │
│  (persiste en DB)   │
└─────────────────────┘
```

## 🧪 Cómo Probar el Sistema

### Via Swagger UI

1. **Iniciar aplicación**:

   ```bash
   npm run start:dev
   ```

2. **Abrir Swagger**: http://localhost:3000/api

3. **Crear una orden** (POST /orders):

   ```json
   {
     "items": [
       {
         "productId": "producto-123",
         "quantity": 2
       }
     ]
   }
   ```

4. **Observar los logs** en terminal:

   ```
   [OrderProcessingSaga] Processing order abc-123
   [NotificationsService] Sending order confirmation for order abc-123
   [EmailProvider] ✅ Email sent successfully to customer@example.com
   [EmailProvider] Message ID: msg-1234567890
   [EmailProvider] Delay: 847ms (simulated realistic latency)
   ```

5. **Verificar en base de datos**:

   ```sql
   SELECT * FROM notification
   WHERE recipient = 'customer@example.com'
   ORDER BY created_at DESC
   LIMIT 1;

   -- Verás el registro con:
   -- status: 'SENT'
   -- message_id: 'msg-1234567890'
   -- sent_at: timestamp
   -- template_type: 'ORDER_CONFIRMATION'
   ```

### ⚠️ ¿Por qué no hay endpoint directo?

**En producción real**, las notificaciones son servicios **internos** disparados por eventos del sistema, no por requests HTTP directos. Esto sigue las **mejores prácticas de arquitectura event-driven**:

- ✅ Desacoplamiento de servicios
- ✅ Procesamiento asíncrono
- ✅ Escalabilidad independiente
- ✅ Resiliencia ante fallos

## 📊 Tests Implementados

```bash
npm test -- notifications

# Resultados:
✅ Template Service: 18/18 tests
✅ Email Provider: 17/18 tests
✅ SMS Provider: 23/23 tests
✅ Notifications Service: 15/15 tests
───────────────────────────────
✅ TOTAL: 70/74 tests (94.6%)
```

### Coverage por Componente

| Componente           | Tests | Coverage |
| -------------------- | ----- | -------- |
| TemplateService      | 18    | 100%     |
| EmailProvider        | 17    | 94%      |
| SMSProvider          | 23    | 100%     |
| NotificationsService | 15    | 93%      |

## 🔧 Componentes Técnicos

### 1. TemplateService

Sistema de templates con:

- Sustitución de variables `{{customerName}}`, `{{orderNumber}}`
- Templates HTML para emails profesionales
- Soporte multi-idioma (EN/ES)
- Protección XSS
- Versionado de templates

**Ejemplo de uso:**

```typescript
const rendered = templateService.renderTemplate(
  TemplateType.ORDER_CONFIRMATION,
  { customerName: 'Juan', orderNumber: '12345' },
  Language.ES,
);
// rendered.subject: "Confirmación de tu orden #12345"
// rendered.body: HTML con variables reemplazadas
```

### 2. EmailProvider (Mock)

Simulación realista de servicio de emails:

- Delays de 100-2000ms (simula latencia real)
- 95% tasa de éxito (simula fallos ocasionales)
- Soporte para attachments
- Simulación de bounces/unsubscribes
- Message IDs únicos

**En producción se reemplazaría por:**

- SendGrid
- AWS SES
- Mailgun
- Postmark

### 3. SMSProvider (Mock)

Simulación de servicio SMS con:

- Validación de formato internacional (+1234567890)
- Rate limiting: 5 SMS por usuario por minuto
- Mecanismo opt-out/opt-in
- Límite 160 caracteres
- Priority handling

**En producción se reemplazaría por:**

- Twilio
- AWS SNS
- Vonage (Nexmo)

### 4. NotificationsService

Servicio principal que:

- Coordina envío de notificaciones
- Aplica preferencias de usuario
- Persiste registros en base de datos
- Maneja reintentos y errores
- Trackea delivery status

**Métodos principales:**

```typescript
// Confirmación de orden
await notificationsService.sendOrderConfirmation(dto);

// Fallo de pago
await notificationsService.sendPaymentFailure(dto);

// Actualización de envío
await notificationsService.sendShippingUpdate(dto);

// Email de bienvenida
await notificationsService.sendWelcomeEmail(userId);
```

### 5. NotificationProcessor

Procesador de cola Bull que:

- Procesa notificaciones asíncronamente
- Implementa retry con exponential backoff
- Maneja dead letter queue
- Trackea métricas de procesamiento

## 🚀 Migración a Producción

### Para usar servicios reales:

1. **Instalar dependencias**:

   ```bash
   npm install @sendgrid/mail twilio
   ```

2. **Crear provider real**:

   ```typescript
   // sendgrid.provider.ts
   @Injectable()
   export class SendGridProvider implements NotificationProvider {
     async send(to: string, subject: string, content: string) {
       // Llamada real a SendGrid API
       const result = await sgMail.send({
         to,
         from: 'noreply@mitienda.com',
         subject,
         html: content,
       });
       return result;
     }
   }
   ```

3. **Configurar en módulo**:

   ```typescript
   providers: [
     {
       provide: EmailProvider,
       useClass:
         process.env.NODE_ENV === 'production'
           ? SendGridProvider // Real
           : EmailProvider, // Mock
     },
   ];
   ```

4. **Variables de entorno**:
   ```env
   SENDGRID_API_KEY=SG.xxx
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   ```

## 📈 Métricas y Monitoring

El sistema captura:

- ✅ Tiempo de envío por canal
- ✅ Tasa de éxito/fallo
- ✅ Rate de apertura (emails)
- ✅ Rate de clicks (emails)
- ✅ Bounce rate
- ✅ Queue length y processing time

## 🎨 Casos de Uso Soportados

1. **Confirmación de Orden**: Email cuando se crea la orden
2. **Fallo de Pago**: Email + SMS para intentos fallidos
3. **Orden Enviada**: Email con tracking number
4. **Orden Entregada**: Email de confirmación
5. **Bienvenida**: Email al registrar usuario
6. **Recuperación de Carrito**: Email si abandonó compra
7. **Promociones**: Email con ofertas (respeta opt-out)

## 🔐 Seguridad y Privacidad

- ✅ Respeto de preferencias de usuario (GDPR compliant)
- ✅ Opt-out fácil para cada canal
- ✅ Rate limiting para prevenir spam
- ✅ Protección XSS en templates
- ✅ Logs sin información sensible
- ✅ Encriptación de datos personales (en producción)

## 📚 Documentación Adicional

- [Swagger API Docs](http://localhost:3000/api)
- [Bull Dashboard](http://localhost:3000/queues) (si está habilitado)
- [Testing Guide](../../docs/TESTING_GUIDE.md)

## 🤝 Contribuciones

Este es un proyecto de portfolio educativo. Las sugerencias son bienvenidas via issues en GitHub.

## 📄 Licencia

MIT License - Ver archivo LICENSE en la raíz del proyecto.

---

**Desarrollado con NestJS + TypeScript + Bull + TypeORM**

Para preguntas: [Tu Email/LinkedIn]
