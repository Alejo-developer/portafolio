// Contenido del portafolio. Para actualizar textos o proyectos, edita solo este archivo.

export const perfil = {
  nombre: "Alejandro Jiménez Pinzón",
  correo: "alejopinzon2415@gmail.com",
  linkedin: "https://www.linkedin.com/in/alejandro-jimenez-pinzon/",
  github: "https://github.com/Alejo-developer",
  hojaDeVida: "/hoja-de-vida-alejandro-jimenez.pdf",
};

export const proyectos = [
  {
    id: "espam",
    nombre: "ESPAM – Estructuras Parra Marroquín",
    tipo: "Cliente real",
    resumen:
      "Sitio web para una empresa de estructuras metálicas con más de 13 años de trayectoria. Muestra su catálogo, sus obras y recibe solicitudes de cotización.",
    hice: [
      "Desarrollé el sitio completo en Java y Spring Boot y lo desplegué en Railway.",
      "Construí un panel administrativo con un módulo de correo bidireccional: los asesores responden a los clientes desde el panel y las respuestas vuelven ahí mismo.",
      "Integré formulario de contacto, WhatsApp y mapa.",
    ],
    stack: ["Java", "Spring Boot", "Railway"],
    enlace: { texto: "Visitar espamsas.com", url: "https://www.espamsas.com/" },
    imagenes: [{ src: "/proyectos/espam.jpg", alt: "Página de inicio del sitio de ESPAM" }],
  },
  {
    id: "microapps",
    nombre: "FyA MicroApps",
    tipo: "Producto propio",
    resumen:
      "Plataforma por suscripción para talleres, barberías, estudios de uñas y restaurantes. Guarda la ficha de cada cliente y avisa cuándo escribirle por WhatsApp para que vuelva.",
    hice: [
      "Diseñé y programé la plataforma con JavaScript sin frameworks.",
      "Usé Supabase para las cuentas de usuario y la base de datos PostgreSQL, con los datos de cada negocio separados.",
      "Integré los pagos con Mercado Pago y Wompi, y la convertí en app instalable en el celular.",
    ],
    stack: ["JavaScript", "Supabase", "PostgreSQL", "Netlify"],
    enlace: { texto: "Visitar FyA MicroApps", url: "https://fyamicroapps.netlify.app/" },
    imagenes: [{ src: "/proyectos/microapps.jpg", alt: "Página de inicio de FyA MicroApps" }],
  },
  {
    id: "qestaciones",
    nombre: "Q-Estaciones de Servicio",
    tipo: "Proyecto académico",
    resumen:
      "App Android para gestionar la distribución de combustible, con seis roles y un menú que cambia según quién inicia sesión.",
    hice: [
      "Programé la app en Java con base de datos Room y migraciones de esquema.",
      "Implementé verificación en dos pasos por correo, validación de subsidios por placa e inventario por empresa.",
      "Añadí reportes en PDF y CSV, mapas con GPS y consumo de una API REST con Retrofit.",
    ],
    stack: ["Java", "Android", "Room", "Retrofit"],
    enlace: { texto: "Ver el código en GitHub", url: "https://github.com/Alejo-developer/QEstacionesDeServicio" },
    imagenes: [
      { src: "/proyectos/qestaciones-login.jpg", alt: "Pantalla de inicio de sesión de Q-Estaciones" },
      { src: "/proyectos/qestaciones-menu.jpg", alt: "Menú del administrador en Q-Estaciones" },
      { src: "/proyectos/qestaciones-venta.jpg", alt: "Registro de una venta con validación de subsidio" },
    ],
  },
  {
    id: "fya",
    nombre: "FyA Innovación Tecnológica",
    tipo: "Sitio de mi emprendimiento",
    resumen: "Sitio web del emprendimiento de desarrollo de software que fundé con un socio en Bogotá.",
    hice: [
      "Lo desarrollé en Spring Boot con Thymeleaf, con servicios, portafolio, planes y formulario de contacto.",
      "Reemplacé los videos por escenas 3D hechas con three.js para que cargara más rápido.",
    ],
    stack: ["Spring Boot", "Thymeleaf", "three.js"],
    enlace: { texto: "Visitar fyainnovation.com", url: "https://www.fyainnovation.com/" },
    imagenes: [{ src: "/proyectos/fya.jpg", alt: "Página de inicio de FyA Innovación Tecnológica" }],
  },
];

// Escenas 3D que hice para mis proyectos. "fondo" es el color del sitio donde se usa cada una.
export const escenas3d = [
  {
    id: "pila",
    nombre: "La aplicación despiezada",
    dondeSeUsa: "Portada de fyainnovation.com",
    descripcion:
      "Una app separada en tres placas: datos, lógica e interfaz. Tiene materiales realistas con reflejos y sombras, código Java que se escribe solo y un cursor que hace clic. Al pasar el ratón, las placas se abren.",
    tecnicas: "Materiales PBR, sombras, texturas dibujadas en canvas",
    fondo: "claro",
  },
  {
    id: "particulas",
    nombre: "Partículas que cambian de forma",
    dondeSeUsa: "Fondo de FyA MicroApps",
    descripcion:
      "Miles de partículas pasan de esfera a anillo, ola y galaxia. Cerca del ratón se iluminan, se apartan y giran para mirarlo.",
    tecnicas: "Shader GLSL propio, transiciones entre formas",
    fondo: "noche",
  },
  {
    id: "red",
    nombre: "Red con paquetes de datos",
    dondeSeUsa: "Secciones oscuras de fyainnovation.com",
    descripcion: "Nodos conectados con pulsos de luz que viajan entre ellos, como datos moviéndose por una red.",
    tecnicas: "Búferes que se reescriben en cada cuadro, mezcla aditiva",
    fondo: "noche",
  },
  {
    id: "antigravedad",
    nombre: "Cápsulas en antigravedad",
    dondeSeUsa: "Sección de portafolio de fyainnovation.com",
    descripcion:
      "Cápsulas suspendidas en anillos. Las que quedan cerca del ratón orbitan a su alrededor y vuelven despacio a su sitio cuando se aleja.",
    tecnicas: "InstancedMesh, niebla para dar profundidad",
    fondo: "niebla",
  },
];

export const tecnologias = [
  { area: "Backend", items: ["Java", "Spring Boot", "Thymeleaf", "API REST"] },
  { area: "Frontend", items: ["JavaScript", "React", "HTML y CSS", "three.js"] },
  { area: "Bases de datos", items: ["PostgreSQL", "MySQL", "MariaDB", "Supabase"] },
  { area: "Móvil", items: ["Android", "Room", "Retrofit"] },
  { area: "Herramientas", items: ["Git y GitHub", "Docker", "Postman", "Netlify y Railway"] },
];

// Ordenada de lo más reciente a lo más antiguo
export const trayectoria = [
  {
    fecha: "Jul 2026",
    titulo: "Cofundo FyA Innovación Tecnológica",
    detalle: "Emprendimiento de desarrollo de software. Entrego el sitio de ESPAM y lanzo FyA MicroApps.",
  },
  {
    fecha: "2025",
    titulo: "Conceptualización y Diseño en Ingeniería",
    detalle: "Certificación de aprendizaje, Educación Continuada de la Universidad Piloto.",
  },
  {
    fecha: "2024",
    titulo: "Patrones de Diseño de Software",
    detalle: "Certificación de aprendizaje, Educación Continuada de la Universidad Piloto.",
  },
  { fecha: "2023", titulo: "Empiezo Ingeniería de Sistemas", detalle: "Universidad Piloto de Colombia, Bogotá." },
];
