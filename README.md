# Portafolio de Alejandro Jiménez Pinzón

Mi portafolio personal: proyectos, tecnologías, trayectoria y contacto, sobre una red de nodos en 3D que reacciona al cursor y al scroll.

![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![three.js](https://img.shields.io/badge/three.js-r186-000000?logo=threedotjs&logoColor=white)

## Qué tiene

- **Escena 3D con three.js**: unos 150 nodos que flotan y se conectan cuando están cerca (70 en el celular). El cursor actúa como un nodo más y la cámara se aleja al hacer scroll.
- **Escenas 3D de mis proyectos, funcionando**: la aplicación despiezada (materiales PBR y sombras), las partículas de FyA MicroApps (shader GLSL propio), la red con paquetes de datos y las cápsulas en antigravedad. Cada una se muestra sobre el fondo del sitio donde se usa.
- **Rendimiento**: la escena se carga aparte para que el texto aparezca primero, y solo se anima mientras el inicio está en pantalla.
- **Accesibilidad**: con "reducir movimiento" activado se muestra una imagen fija; incluye navegación por teclado y enlace para saltar al contenido.
- **Contenido separado del diseño**: todos los textos y proyectos están en [`src/datos.js`](src/datos.js).

## Estructura

```
src/
├── App.jsx       ← secciones de la página
├── RedNodos.jsx  ← escena 3D de la red de nodos
├── Escenas3D.jsx ← galería de escenas 3D (se cargan al acercarse)
├── escenas/      ← código de las escenas de FyA y MicroApps
├── datos.js      ← textos, proyectos y trayectoria
└── index.css     ← estilos y paleta de colores
public/
├── proyectos/    ← capturas de los proyectos
└── hoja-de-vida-alejandro-jimenez.pdf
```

## Cómo ejecutarlo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # versión de producción en dist/
```

### Con Docker

El `Dockerfile` compila el sitio con Node y lo sirve con nginx (imagen final de unos 76 MB):

```bash
docker build -t portafolio-alejandro .
docker run -d --name portafolio -p 8090:80 portafolio-alejandro
# abrir http://localhost:8090
```

## Contacto

[LinkedIn](https://www.linkedin.com/in/alejandro-jimenez-pinzon/) · [GitHub](https://github.com/Alejo-developer) · alejopinzon2415@gmail.com
