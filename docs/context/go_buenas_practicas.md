Resumen de Buenas Prácticas, Estructuras y Conceptos para Desarrollo Backend con Go

1. Estructura y Arquitectura del Proyecto
   El desarrollo en Go enfatiza la simplicidad y el código idiomático, a menudo favoreciendo una estructura centrada en paquetes (package-based structure) sobre arquitecturas con capas rígidas copiadas de lenguajes orientados a objetos como Java.
   Organización por Funcionalidad: La estructura recomendada organiza el código por contexto o funcionalidad, en lugar de por capas técnicas (como controllers o services). Los paquetes deben ser cohesivos y encapsular su propia lógica, modelos y métodos de acceso a datos.
   Estructura Típica de Proyecto:
   /cmd: Contiene los puntos de entrada principales (main.go) para diferentes ejecutables.
   /internal: Contiene la lógica central y privada de la aplicación, dividida en paquetes funcionales (ej., /internal/user, /internal/order). El código aquí no debe ser accesible desde módulos externos.
   /pkg: Para componentes compartidos y reutilizables, como utilidades de autenticación o logging, que podrían usarse externamente o en otros módulos.
   /api: Contiene los handlers para solicitudes HTTP o gRPC, a menudo organizados por versión (ej., /api/v1).
   Principios Arquitectónicos (Adaptados a Go): Aunque la Arquitectura Limpia/Hexagonal (Puertos y Adaptadores) no es siempre idiomática, sus principios de bajo acoplamiento, fácil testing e Inversión de Dependencias son valiosos.
   Inversión de Dependencias: Las capas externas (detalles de implementación o adapters) deben depender de las abstracciones (interfaces) definidas por las capas internas (dominio/aplicación), no al revés.
   Interfaces del Lado del Cliente (Consumer-Side Interfaces): Las interfaces se implementan implícitamente en Go, por lo que deben definirse en el lado del código que las consume, no en el lado del productor. Esto ayuda a evitar la contaminación de interfaces.
2. Diseño Idiomático y Patrones
   Nomenclatura: Los nombres de los paquetes deben ser cortos, concisos y en minúsculas. Nómbrelos por lo que proporcionan, no por lo que contienen (evite util, common, shared).
   Interfaces: Las interfaces de un solo método suelen nombrarse con el sufijo -er (ej., Reader, Writer). Cree interfaces solo cuando sean necesarias (abstractions should be discovered, not created).
   Getters y Setters: Generalmente, no es idiomático forzar el uso de getters y setters en Go; el acceso directo a los campos de la estructura no exportada (en minúsculas) es común si no se necesita lógica adicional.
   Patrón de Opciones Funcionales (Functional Options): Utilice este patrón para manejar la configuración de estructuras con múltiples parámetros opcionales, proporcionando una API amigable y flexible.
   Modularidad y Exportación: Minimice lo que se exporta (uso de mayúsculas); por defecto, no exporte un elemento si no está seguro, para reducir el acoplamiento entre paquetes.
   Legibilidad: Evite el anidamiento excesivo de código. Mantenga el "camino feliz" alineado a la izquierda y use cláusulas de guarda (retornos anticipados) para manejar errores y precondiciones.
3. Manejo de Errores (Error Handling)
   El manejo de errores en Go es explícito y trata los errores como valores.
   Valores de Retorno Múltiples: Las funciones que pueden fallar deben devolver un valor de tipo error como el último parámetro.
   Patrón Base: Use siempre el patrón if err != nil para verificar y manejar errores.
   Wrapping de Errores: Use el verbo %w en fmt.Errorf para envolver errores y añadir contexto útil (como el nombre de la operación o el contexto) sin perder la referencia al error original.
   Uso de panic y recover: Reserve panic para errores inesperados e irrecuperables (errores de programador, fallas de dependencia obligatorias). Las fallas predecibles (entradas de usuario inválidas, timeouts, archivos faltantes) deben manejarse devolviendo un valor de error.
   Inspección de Errores:
   Use errors.Is() para verificar si un error envuelto coincide con un error centinela específico (variables globales de error, ej., ErrNotFound).
   Use errors.As() para verificar si un error envuelto es de un tipo de error personalizado (estructuras que implementan Error() string).
   Manejo Único: Un error debe ser manejado (registrado o devuelto) solo una vez en la cadena de llamadas para evitar duplicación y confusión.
4. Concurrencia y Recursos
   defer: Use la función defer para garantizar que los recursos (como archivos, conexiones) se cierren o liberen automáticamente cuando la función que los contiene retorna.
   Recuerde que los argumentos de defer se evalúan inmediatamente. Si necesita evaluar una variable al momento del retorno, envuelva la llamada en una closure (función anónima) dentro de defer.
   Evite usar defer dentro de bucles sin envolver la lógica del bucle en una función interna, para prevenir fugas de recursos.
   Contexto (context.Context): Es esencial para manejar timeouts, cancelaciones y transportar valores a través de los límites de la API y las goroutines.
   Debe ser el primer parámetro de las funciones que lo utilicen.
   Siempre llame a cancel() (obtenido de context.WithTimeout, etc.) usando defer para liberar los recursos asociados al contexto, incluso si el contexto ya expiró.
   Use context.Value() para datos específicos de la solicitud (request-scoped) (ej., IDs de traza o de usuario), utilizando claves de tipo personalizado para evitar colisiones.
   Carreras de Datos (Data Races): Habilite la flag -race en las pruebas si su aplicación utiliza concurrencia, para detectar condiciones de carrera.
5. Testing
   Enfoque de Testing: Go fomenta las pruebas de integración y el testing con implementaciones reales, además de las pruebas unitarias.
   Tests Basados en Tablas (Table-Driven Tests): Utilice este patrón para agrupar múltiples casos de prueba similares en una estructura concisa y legible.
   Pruebas de Integración: Para interactuar con bases de datos o servicios externos, use herramientas como Testcontainers o levante instancias del servidor API directamente para realizar peticiones HTTP simuladas dentro de las pruebas.
   Recomendación de Dependencias: Evite usar sleeps en las pruebas unitarias; use mecanismos de sincronización o reintentos.

Prompt para el Agente de IA
A continuación, se presenta un prompt que instruye al agente de IA sobre las mejores prácticas y los principios que debe aplicar para generar código Go de calidad y obtener la aprobación de un experto.

Instrucciones para la Generación de Código Go (Estándares de Excelencia Backend)
Usted es un experto desarrollador de Go. Su objetivo es producir código backend que sea claro, idiomático y robusto, cumpliendo estrictamente con los siguientes estándares de calidad, diseño y testing de la comunidad Go.

1. Principios de Arquitectura y Diseño
   Priorizar la Simplicidad Idiomática: El código debe ser simple, directo y claro (claro es mejor que inteligente). Evite forzar patrones complejos de otros paradigmas (como la herencia OOP pesada o la sobre-ingeniería Java/C#).
   Organización por Paquetes (Modularidad Funcional): La estructura del código debe organizarse en paquetes cohesivos definidos por su funcionalidad o dominio (ej., user, order), no por capas técnicas rígidas.
   Nomenclatura: Los nombres de los paquetes deben ser cortos, concisos y en minúsculas. Nunca use nombres de paquetes genéricos como util, common o shared.
   Interfaces Mínimas: Implemente interfaces solo donde sean estrictamente necesarias (ej., para facilitar el testing o desacoplar implementaciones externas). Las interfaces deben definirse en el lado del código consumidor, no del productor.
   Minimizar la Exportación: Solo los elementos que necesitan ser accesibles fuera del paquete deben exportarse (nombres en mayúsculas). Por defecto, los elementos internos deben ser privados.
   Configuración Flexible: Si la estructura requiere múltiples opciones de configuración, utilice el Patrón de Opciones Funcionales en lugar de estructuras de configuración complejas o builders tradicionales.
2. Manejo de Errores y Recursos
   Manejo de Errores Explícito: Utilice el patrón if err != nil para manejar errores como valores devueltos. Las funciones que pueden fallar deben devolver error como el último valor.
   Añadir Contexto a Errores (Wrapping): Siempre que un error se propague hacia arriba en la pila de llamadas, debe envolver el error original usando fmt.Errorf con el verbo %w, añadiendo contexto de la operación.
   Cláusulas de Guarda (Retorno Anticipado): Implemente retornos anticipados y cláusulas de guarda para manejar errores o condiciones no válidas. El "camino feliz" (lógica de ejecución exitosa) debe permanecer lo menos anidado posible, alineado a la izquierda.
   Uso de defer para Liberación: Utilice la instrucción defer inmediatamente después de la asignación de recursos (archivos, conexiones, locks) para garantizar su liberación o cierre, incluso si la función retorna debido a un error.
   Reservar panic: La función panic debe reservarse exclusivamente para errores irrecuperables del programa o fallas de configuración fundamentales. Las fallas operativas esperadas (validación, I/O, timeouts) deben devolverse como valores de error.
3. Concurrencia y Pruebas
   Uso de context.Context: Toda función que pueda tardar o deba ser cancelada debe aceptar un argumento context.Context como su primer parámetro. Asegúrese de manejar la cancelación del contexto (<-ctx.Done()) en operaciones de larga duración.
   Preparación para Testing: El código debe estar diseñado para permitir pruebas unitarias e integración sencillas.
   Diseño Orientado a Tablas: Para probar casos múltiples, genere Tests Basados en Tablas que definan claramente la entrada, el resultado esperado y el manejo de errores para cada escenario.
   Documentación: Todo elemento exportado (estructuras, interfaces, funciones, variables) debe estar documentadocon comentarios que expliquen su propósito. Los comentarios de función deben describir qué hace la función, no cómo lo hace.
