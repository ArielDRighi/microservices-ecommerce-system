# 🚀 Pull Request

## 📋 Descripción

Descripción clara y concisa de los cambios implementados en este PR.

## 🔗 Issue Relacionado

Fixes #(número del issue)

<!-- o -->

Closes #(número del issue)

<!-- o -->

Related to #(número del issue)

## 🎯 Tipo de Cambio

¿Qué tipo de cambio introduce este PR?

- [ ] 🐛 Bug fix (cambio no-breaking que soluciona un issue)
- [ ] ✨ New feature (cambio no-breaking que añade funcionalidad)
- [ ] 💥 Breaking change (fix o feature que causaría que funcionalidad existente no funcione como se espera)
- [ ] 📖 Documentation update (cambios solo en documentación)
- [ ] 🔨 Refactoring (cambio de código que ni corrige bugs ni añade features)
- [ ] ⚡ Performance improvement (cambio que mejora performance)
- [ ] 🧪 Test addition/update (añadir o actualizar tests)
- [ ] 🔧 Build/CI changes (cambios en build, CI, dependencias)

## 🧪 Testing

Describe las pruebas que realizaste para verificar tus cambios:

### Tests Automatizados

- [ ] Unit tests pasan (`npm run test`)
- [ ] Integration tests pasan (`npm run test:e2e`)
- [ ] Code coverage mantiene/mejora el umbral mínimo
- [ ] All existing tests still pass

### Tests Manuales

Describe los escenarios que probaste manualmente:

1. **Scenario 1**:

   - Steps:
   - Expected:
   - Actual:

2. **Scenario 2**:
   - Steps:
   - Expected:
   - Actual:

## 📸 Screenshots

Si los cambios incluyen UI/UX, por favor incluye screenshots:

| Antes         | Después         |
| ------------- | --------------- |
| ![antes](url) | ![después](url) |

## ✅ Checklist de Code Quality

### 📝 Código

- [ ] Mi código sigue las convenciones de estilo del proyecto
- [ ] Realicé una auto-revisión de mi código
- [ ] Comenté mi código en partes complicadas de entender
- [ ] Mis cambios no generan nuevos warnings
- [ ] Agregué tests que cubren mis cambios
- [ ] Tests nuevos y existentes pasan localmente

### 🔍 Quality Gates

- [ ] `npm run lint` pasa sin errores
- [ ] `npm run type-check` pasa sin errores
- [ ] `npm run format` fue aplicado
- [ ] `npm run build` es exitoso
- [ ] `npm audit` no muestra vulnerabilidades críticas

### 📖 Documentación

- [ ] Actualicé la documentación correspondiente
- [ ] Actualicé comentarios JSDoc si es necesario
- [ ] Actualicé el README.md si es necesario
- [ ] Actualicé la documentación de API (Swagger) si aplica

## 🔄 Cambios en Base de Datos

Si este PR incluye cambios en BD, marca los aplicables:

- [ ] Nueva migración incluida
- [ ] Seeds actualizados si es necesario
- [ ] Índices agregados/modificados
- [ ] Validé que migración es reversible
- [ ] No hay breaking changes en schema existente

## 🚀 Deployment Considerations

- [ ] Este PR puede deployarse independientemente
- [ ] No requiere cambios de configuración especiales
- [ ] No requiere migrations manuales
- [ ] Compatible con versión anterior (backward compatible)
- [ ] Variables de entorno documentadas si se añadieron nuevas

## 📋 Areas Impactadas

¿Qué áreas del sistema se ven afectadas por este cambio?

- [ ] 🔐 Authentication & Authorization
- [ ] 📦 Orders Processing
- [ ] 💳 Payment System
- [ ] 📊 Inventory Management
- [ ] 📧 Notifications
- [ ] ⚙️ Queue Processing
- [ ] 🗄️ Database Layer
- [ ] 🌐 API Endpoints
- [ ] 🔍 Search & Filtering
- [ ] 📈 Monitoring & Logging
- [ ] 🧪 Testing Infrastructure
- [ ] 📖 Documentation
- [ ] 🔧 Build/CI System

## 🔐 Security Checklist

Si este PR maneja datos sensibles o autenticación:

- [ ] No expongo credenciales o secrets
- [ ] Input validation implementada
- [ ] Authorization checks en su lugar
- [ ] Logs no contienen información sensible
- [ ] Seguí las mejores prácticas de seguridad del proyecto

## 📝 Notas Adicionales

Información adicional relevante para los reviewers:

### Context

¿Por qué se necesitaba este cambio?

### Technical Decisions

¿Hubo decisiones técnicas importantes que tomar? ¿Por qué se eligió esta aproximación?

### Future Work

¿Hay trabajo futuro relacionado que se debe hacer después de este PR?

## 🏷️ Labels Sugeridos

- [ ] `ready-for-review` - PR está listo para revisión
- [ ] `work-in-progress` - PR está en desarrollo
- [ ] `needs-discussion` - PR necesita discusión antes de merge
- [ ] `breaking-change` - PR introduce breaking changes
- [ ] `performance` - PR mejora performance
- [ ] `security` - PR relacionado con seguridad
- [ ] `dependencies` - PR actualiza dependencias
- [ ] `refactor` - PR refactoriza código existente

---

## 👥 Para Reviewers

### 🔍 Focus Areas

Por favor enfócate especialmente en:

- [ ] Lógica de negocio
- [ ] Performance implications
- [ ] Security concerns
- [ ] Code maintainability
- [ ] Test coverage
- [ ] Documentation accuracy

### ⏱️ Review Priority

- [ ] 🔥 Urgent - hotfix o blocking issue
- [ ] ⚡ High - feature importante
- [ ] 📋 Normal - development regular
- [ ] 💭 Low - mejoras nice-to-have

---

**¡Gracias por contribuir al proyecto! 🎉**
