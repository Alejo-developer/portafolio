/* =========================================================
   F & A — escenas 3D de la web (three.js r186)

   Copiadas de la web de FyA Innovación Tecnológica para mostrarlas
   en el portafolio. Aquí no se montan solas: React llama a
   montarEscena(caja, nombre) y recibe una función para desmontarla.

   Sustituyen a los vídeos de fondo. Cada contenedor con
   data-escena="..." recibe su propio lienzo:

     pila  → portada: una aplicación "despiezada" en tres placas
             (interfaz, lógica y datos) con aspecto de objeto real
             (materiales físicos, reflejos, luz móvil y sombras) y
             pantallas con contenido: código que se escribe, un
             cursor que hace clic, una tabla de datos.
     red   → fondos oscuros: una red de nodos con paquetes de
             datos viajando entre ellos.
     antigravedad → fondo claro del Portafolio: cápsulas suspendidas
             en anillos; las que están cerca del ratón orbitan a su
             alrededor y vuelven despacio a su sitio al alejarse.

   Opciones por atributo:
     data-estatico="si"  dibuja un solo fotograma, sin animación
                         (páginas legales: texto largo encima).
     data-densidad="3"   (antigravedad) cuántas más partículas que
                         la base; data-escala="0.6", de qué tamaño.

   Peso y consumo:
     - Los fondos (red, antigravedad) usan materiales sin luces.
       Solo la pila de la portada lleva luces, reflejos y una
       sombra (un mapa de 1024 px, 512 en móvil).
     - El bucle se detiene cuando el lienzo sale de pantalla y
       cuando la pestaña está oculta.
     - Con "reducir movimiento" se dibuja la escena ya armada y
       quieta, sin bucle.
     - Si el navegador no tiene WebGL, el contenedor se queda con
       su fondo CSS de respaldo y no pasa nada más.

   Compilar: en frontend-3d/, `npm run build`.
   ========================================================= */

import {
    WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, InstancedMesh, Points, LineSegments,
    BufferGeometry, BufferAttribute, PlaneGeometry, BoxGeometry, CylinderGeometry, CapsuleGeometry,
    SphereGeometry, TorusGeometry, ExtrudeGeometry, ShapeGeometry, Shape, Fog,
    MeshBasicMaterial, MeshStandardMaterial, MeshPhysicalMaterial, ShadowMaterial, LineBasicMaterial, PointsMaterial,
    DirectionalLight, HemisphereLight, PMREMGenerator, NeutralToneMapping, PCFShadowMap,
    CanvasTexture, Color, Object3D, Vector2, Timer, MathUtils, AdditiveBlending, SRGBColorSpace
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { escenaParticulas } from './escenaParticulas.js';

const QUIETO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOVIL = window.matchMedia('(max-width: 760px)').matches;

/* Paleta de marca (la misma de estilo.css) */
const AZUL = 0x0b63f6;
const AZUL_CLARO = 0x3d8bff;
const AZUL_PROFUNDO = 0x0a3fa8;

/* ---------- utilidades ---------- */

const suavizar = (t) => 1 - Math.pow(1 - t, 3);          // ease-out cúbico
const entre = (t, a, b) => MathUtils.clamp((t - a) / (b - a), 0, 1);

/** Disco difuminado para que los puntos no sean cuadrados. */
function texturaPunto() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, 'rgba(255,255,255,1)');
    d.addColorStop(0.35, 'rgba(255,255,255,.85)');
    d.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = d;
    g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
}

/** Rectángulo de esquinas redondeadas centrado en el origen. */
function rectRedondeado(ancho, fondo, radio) {
    const x = -ancho / 2, y = -fondo / 2, s = new Shape();
    s.moveTo(x + radio, y);
    s.lineTo(x + ancho - radio, y);
    s.quadraticCurveTo(x + ancho, y, x + ancho, y + radio);
    s.lineTo(x + ancho, y + fondo - radio);
    s.quadraticCurveTo(x + ancho, y + fondo, x + ancho - radio, y + fondo);
    s.lineTo(x + radio, y + fondo);
    s.quadraticCurveTo(x, y + fondo, x, y + fondo - radio);
    s.lineTo(x, y + radio);
    s.quadraticCurveTo(x, y, x + radio, y);
    return s;
}

/** Rectángulo redondeado relleno en un canvas 2D. */
function rr(g, x, y, w, h, r, relleno) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fillStyle = relleno;
    g.fill();
}

/**
 * Plano tumbado con esquinas redondeadas y UV de 0 a 1 (ShapeGeometry da como
 * UV las coordenadas crudas de la forma; aquí se normalizan para la textura).
 * La parte de arriba de la textura queda hacia el fondo de la placa.
 */
function pantalla(ancho, fondo, radio) {
    const geo = new ShapeGeometry(rectRedondeado(ancho, fondo, radio), 8);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
        uv.setXY(i, p.getX(i) / ancho + 0.5, p.getY(i) / fondo + 0.5);
    }
    return geo.rotateX(-Math.PI / 2);
}

/* =========================================================
   Escena "pila": la portada

   Una aplicación despiezada en tres placas — datos, lógica e
   interfaz — con aspecto de objeto real: materiales físicos (PBR)
   con barniz, reflejos de un estudio fotográfico (RoomEnvironment),
   una luz que se mueve despacio y sombras de verdad.

   Las pantallas tienen contenido real: código Java que se escribe
   letra a letra, una aplicación con un cursor que la recorre y hace
   clic, y una tabla de datos.

   Movimiento: las placas llegan volando de una en una, de abajo
   arriba, y encajan con un pequeño rebote. Luego cada una flota a
   su ritmo, el conjunto "respira", se mece, sigue al puntero, se
   abre más al pasar el ratón por encima y al bajar por la página.
   ========================================================= */

function escenaPila({ escena, camara, estado, renderer }) {
    const ANCHO = 3.2, FONDO = 2.15, GROSOR = 0.05, BISEL = 0.025;
    // La extrusión crece hacia arriba y el bisel añade grosor por las dos caras
    const ARRIBA = GROSOR + BISEL + 0.004;
    const SW = ANCHO - 0.26, SD = FONDO - 0.26;          // tamaño de la pantalla (deja ver el marco)
    const x0 = -SW / 2, z0 = -SD / 2;
    const LETRA = 'Inter, "Segoe UI", system-ui, sans-serif';
    const MONO = 'Consolas, Menlo, "Cascadia Code", "Courier New", monospace';

    /* --- Render físico: solo esta escena lo necesita --- */
    renderer.toneMapping = NeutralToneMapping;           // la que menos altera los azules de marca
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    const pmrem = new PMREMGenerator(renderer);
    const estudio = new RoomEnvironment();
    escena.environment = pmrem.fromScene(estudio, 0.04).texture;
    escena.environmentIntensity = 0.7;
    estudio.dispose();
    pmrem.dispose();

    // Luz principal: dibuja las sombras. Se mueve despacio (ver actualizar), así
    // que brillos y sombras se desplazan como bajo una luz real.
    const luz = new DirectionalLight(0xffffff, 1.5);
    luz.position.set(-3, 8, 4);
    luz.castShadow = true;
    luz.shadow.mapSize.set(MOVIL ? 512 : 1024, MOVIL ? 512 : 1024);
    Object.assign(luz.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 2, far: 20 });
    luz.shadow.camera.updateProjectionMatrix();
    luz.shadow.normalBias = 0.02;
    luz.shadow.radius = 6;
    escena.add(luz);
    escena.add(new HemisphereLight(0xffffff, 0xc9dbf7, 0.55));

    const raiz = new Group();
    escena.add(raiz);

    /* --- Materiales --- */
    const marcoClaro = new MeshPhysicalMaterial({
        color: 0xf3f7fd, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1
    });
    const marcoOscuro = new MeshPhysicalMaterial({
        color: 0x0c1631, roughness: 0.25, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.06
    });
    const metalAzul = new MeshPhysicalMaterial({
        color: 0xffffff, roughness: 0.22, metalness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.1
    });
    const acero = new MeshStandardMaterial({ color: 0xdbe5f3, roughness: 0.25, metalness: 1 });
    const matLuz = (color) => new MeshBasicMaterial({ color, toneMapped: false });

    /** Material de pantalla: la textura se ilumina (recibe luz, sombra y reflejos,
     *  como un objeto) y además emite, como los píxeles de una pantalla. La clara
     *  emite poco (si no, el blanco se quema); la oscura, más. specularIntensity
     *  bajo: el reflejo del estudio queda como un brillo suave y no vela la imagen. */
    function matPantalla(lienzo, emision) {
        const t = new CanvasTexture(lienzo);
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return new MeshPhysicalMaterial({
            map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: emision,
            roughness: 0.22, metalness: 0, specularIntensity: 0.35
        });
    }

    /* --- Geometrías comunes --- */
    const geoPlaca = new ExtrudeGeometry(rectRedondeado(ANCHO, FONDO, 0.16), {
        depth: GROSOR, bevelEnabled: true, bevelThickness: BISEL, bevelSize: BISEL, bevelSegments: 4, curveSegments: 10
    });
    geoPlaca.rotateX(-Math.PI / 2);
    const geoPantalla = pantalla(SW, SD, 0.1);

    // Lienzos de las pantallas: mismas proporciones que la pantalla
    const CW = 1024, CH = Math.round(CW * SD / SW);
    const lienzo = () => Object.assign(document.createElement('canvas'), { width: CW, height: CH });
    // De píxel del lienzo a coordenadas de la placa
    const enX = (cx) => x0 + cx / CW * SW;
    const enZ = (cy) => z0 + cy / CH * SD;

    function placa(marco, matPant) {
        const g = new Group();
        const cuerpo = new Mesh(geoPlaca, marco);
        cuerpo.castShadow = cuerpo.receiveShadow = true;
        const pant = new Mesh(geoPantalla, matPant);
        pant.position.y = ARRIBA;
        pant.receiveShadow = true;
        g.add(cuerpo, pant);
        return g;
    }

    function texto(g, t, x, y, tam, peso, color, alinear) {
        g.font = `${peso} ${tam}px ${LETRA}`;
        g.fillStyle = color;
        g.textAlign = alinear || 'left';
        g.textBaseline = 'middle';
        g.fillText(t, x, y);
    }

    /* --- Placa 1: interfaz (un panel de una aplicación web) --- */
    const lInterfaz = lienzo();
    // Rectángulos de las zonas en las que el cursor hace clic (en píxeles del lienzo)
    const TARJETAS = [[212, 256, 252, 130], [482, 256, 252, 130], [752, 256, 252, 130], [212, 76, 792, 160]];
    function pintarInterfaz() {
        const g = lInterfaz.getContext('2d');
        g.fillStyle = '#f7faff';
        g.fillRect(0, 0, CW, CH);
        g.fillStyle = '#e8f0fc';
        g.fillRect(0, 0, CW, 56);
        ['#ff6b6b', '#f6c945', '#46c46e'].forEach((c, i) => {
            g.beginPath(); g.arc(30 + i * 24, 28, 8, 0, Math.PI * 2); g.fillStyle = c; g.fill();
        });
        rr(g, 120, 15, 340, 26, 13, '#ffffff');
        texto(g, 'app.miempresa.co/panel', 140, 28, 15, 500, '#7d8ca0');

        rr(g, 20, 76, 170, CH - 96, 16, '#edf3fc');
        texto(g, 'F&A', 40, 108, 24, 800, '#0b63f6');
        ['Inicio', 'Pedidos', 'Clientes', 'Inventario', 'Reportes'].forEach((t, i) => {
            const y = 158 + i * 46;
            if (i === 0) rr(g, 32, y - 17, 146, 34, 10, '#0b63f6');
            texto(g, t, 50, y, 17, 600, i === 0 ? '#ffffff' : '#5b6b81');
        });

        const d = g.createLinearGradient(212, 0, 1004, 0);
        d.addColorStop(0, '#0b63f6');
        d.addColorStop(1, '#3d8bff');
        rr(g, 212, 76, 792, 160, 18, d);
        texto(g, 'Pedidos de hoy', 244, 112, 20, 600, 'rgba(255,255,255,.85)');
        texto(g, '128', 244, 170, 60, 800, '#ffffff');
        rr(g, 370, 156, 86, 30, 15, 'rgba(255,255,255,.95)');
        texto(g, '+12 %', 413, 171, 16, 700, '#0b63f6', 'center');
        // Línea de tendencia
        g.beginPath();
        [[640, 200], [700, 180], [760, 190], [820, 150], [880, 160], [960, 110]].forEach(([x, y], i) =>
            i ? g.lineTo(x, y) : g.moveTo(x, y));
        g.strokeStyle = 'rgba(255,255,255,.9)';
        g.lineWidth = 5;
        g.lineCap = g.lineJoin = 'round';
        g.stroke();

        [['Clientes', '54'], ['Entregas', '97 %'], ['Satisfacción', '4,9']].forEach(([t, v], i) => {
            const x = 212 + i * 270;
            rr(g, x, 256, 252, 130, 16, '#ffffff');
            rr(g, x + 20, 278, 38, 38, 10, '#dbe7fb');
            texto(g, t, x + 72, 297, 16, 600, '#5b6b81');
            texto(g, v, x + 20, 352, 34, 800, '#101a28');
        });

        rr(g, 212, 406, 792, CH - 426, 18, '#ffffff');
        texto(g, 'Ventas por semana', 236, 436, 17, 600, '#3d4c60');
        g.fillStyle = '#e1ebfa';
        g.fillRect(244, CH - 56, 728, 3);
    }
    pintarInterfaz();
    const matInterfaz = matPantalla(lInterfaz, 0.12);
    const capaInterfaz = placa(marcoClaro, matInterfaz);

    // Gráfica en relieve: barras de metal azul que suben y bajan (los datos "vivos")
    const BARRAS = 8;
    const barras = new InstancedMesh(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0), metalAzul, BARRAS);
    barras.castShadow = true;
    barras.frustumCulled = false;
    {
        const c = new Color();
        for (let i = 0; i < BARRAS; i++) barras.setColorAt(i, c.set(i % 2 ? AZUL_CLARO : AZUL));
    }
    capaInterfaz.add(barras);
    const oBarra = new Object3D();
    function moverBarras(t, crecer) {
        for (let i = 0; i < BARRAS; i++) {
            const alto = (0.1 + 0.3 * (0.55 + 0.45 * Math.sin(t * 1.3 + i * 0.85))) * crecer;
            oBarra.position.set(enX(300 + i * 88), ARRIBA, enZ(CH - 62));
            oBarra.scale.set(0.12, Math.max(alto, 0.001), 0.12);
            oBarra.updateMatrix();
            barras.setMatrixAt(i, oBarra.matrix);
        }
        barras.instanceMatrix.needsUpdate = true;
    }

    // Resaltado de la zona en la que hace clic el cursor
    const resaltes = TARJETAS.map(([x, y, w, h]) => {
        const m = new Mesh(pantalla(w / CW * SW, h / CH * SD, 0.05),
            new MeshBasicMaterial({ color: AZUL, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
        m.position.set(enX(x + w / 2), ARRIBA + 0.003, enZ(y + h / 2));
        capaInterfaz.add(m);
        return m;
    });

    // Cursor: una flecha de verdad, flotando un poco sobre la pantalla (proyecta
    // su sombra en ella, que es lo que hace que se lea como un objeto)
    const flecha = new Shape();
    [[0, 0], [0, -1], [0.27, -0.76], [0.45, -1.12], [0.6, -1.05], [0.42, -0.7], [0.74, -0.7]].forEach(([x, y], i) =>
        i ? flecha.lineTo(x, y) : flecha.moveTo(x, y));
    const cursor3d = new Group();
    const puntaBlanca = new Mesh(new ShapeGeometry(flecha).rotateX(-Math.PI / 2), matLuz(0xffffff));
    const bordeOscuro = new Mesh(new ShapeGeometry(flecha).rotateX(-Math.PI / 2).scale(1.22, 1, 1.18).translate(-0.04, -0.004, -0.06),
        matLuz(0x101a28));
    puntaBlanca.castShadow = bordeOscuro.castShadow = true;
    cursor3d.add(bordeOscuro, puntaBlanca);
    cursor3d.scale.setScalar(0.13);
    capaInterfaz.add(cursor3d);
    // Recorrido: tarjeta, tarjeta, tarjeta, bloque principal (índices de TARJETAS)
    const PASO = 1.9;                                     // segundos por parada (viaje + clic)
    const centro = (i) => {
        const [x, y, w, h] = TARJETAS[i];
        return [enX(x + w * 0.55), enZ(y + h * 0.6)];
    };

    /* --- Placa 2: lógica (un editor con código que se escribe solo) --- */
    const CODIGO = [
        [['@RestController', '#7fdba4']],
        [['public class ', '#6fb0ff'], ['PedidosController', '#e8eefc'], [' {', '#a9b8cc']],
        [['    private final ', '#6fb0ff'], ['PedidoService', '#e8eefc'], [' servicio;', '#a9b8cc']],
        [],
        [['    @PostMapping', '#7fdba4'], ['("/pedidos")', '#f6c97a']],
        [['    public ', '#6fb0ff'], ['Pedido', '#e8eefc'], [' crear(', '#a9b8cc'], ['@RequestBody', '#7fdba4'], [' Pedido p) {', '#a9b8cc']],
        [['        return ', '#6fb0ff'], ['servicio', '#e8eefc'], ['.guardar(p);', '#a9b8cc']],
        [['    }', '#a9b8cc']],
        [['}', '#a9b8cc']]
    ];
    const TOTAL = CODIGO.reduce((n, l) => n + l.reduce((m, [t]) => m + t.length, 0) + 1, 0);
    const lLogica = lienzo();
    const matLogica = matPantalla(lLogica, 0.75);
    let ultimoCodigo = -1;

    function pintarCodigo(visibles, conCursor) {
        const clave = visibles * 2 + (conCursor ? 1 : 0);
        if (clave === ultimoCodigo) return;              // solo se sube la textura si cambió algo
        ultimoCodigo = clave;
        const g = lLogica.getContext('2d');
        g.fillStyle = '#0a1330';
        g.fillRect(0, 0, CW, CH);
        g.fillStyle = '#0d1736';
        g.fillRect(0, 0, CW, 50);
        rr(g, 20, 10, 270, 32, 7, '#16234b');
        texto(g, 'PedidosController.java', 38, 27, 16, 500, '#c9d6ee');
        g.fillStyle = '#0e1a3d';
        g.fillRect(0, 50, 80, CH - 50);

        g.font = `500 25px ${MONO}`;
        g.textBaseline = 'middle';
        let quedan = visibles, cx = 110, cy = 96;
        CODIGO.forEach((linea, n) => {
            const y = 96 + n * 50;
            g.textAlign = 'right';
            g.fillStyle = '#3a4d7a';
            g.fillText(String(n + 1), 58, y);
            g.textAlign = 'left';
            let x = 110;
            if (quedan > 0) { cx = x; cy = y; }
            for (const [t, color] of linea) {
                if (quedan <= 0) break;
                const parte = t.slice(0, quedan);
                quedan -= parte.length;
                g.fillStyle = color;
                g.fillText(parte, x, y);
                x += g.measureText(parte).width;
                cx = x; cy = y;
            }
            if (quedan > 0) quedan -= 1;                  // el salto de línea también "se escribe"
        });
        if (conCursor) {
            g.fillStyle = '#e8eefc';
            g.fillRect(cx + 2, cy - 15, 12, 30);
        }
        matLogica.map.needsUpdate = true;
    }
    pintarCodigo(QUIETO ? TOTAL : 0, true);
    const capaLogica = placa(marcoOscuro, matLogica);

    /* --- Placa 3: datos (tabla y base de datos) --- */
    const lDatos = lienzo();
    function pintarDatos() {
        const g = lDatos.getContext('2d');
        g.fillStyle = '#f7faff';
        g.fillRect(0, 0, CW, CH);
        rr(g, 24, 24, 580, CH - 48, 18, '#ffffff');
        rr(g, 24, 24, 580, 58, 18, '#dce8fb');
        ['Cliente', 'Estado', 'Total'].forEach((t, i) => texto(g, t, 48 + i * 190, 53, 17, 700, '#3d4c60'));
        const estados = [['Pagado', '#d9f5e3', '#1f8a4c'], ['Pendiente', '#fdf0d5', '#9a6a00'], ['Enviado', '#dfeafc', '#0a3fa8']];
        for (let fila = 0; fila < 7; fila++) {
            const y = 118 + fila * 66;
            texto(g, `Cliente ${String(fila + 1).padStart(3, '0')}`, 48, y, 17, 500, '#3d4c60');
            const [t, fondo, color] = estados[fila % 3];
            rr(g, 238, y - 15, 112, 30, 15, fondo);
            texto(g, t, 294, y, 14, 700, color, 'center');
            rr(g, 428, y - 8, 120 - (fila * 23) % 60, 16, 8, '#e3ecfa');
            g.fillStyle = '#eef3fb';
            g.fillRect(44, y + 32, 540, 2);
        }
        g.beginPath();
        g.arc(800, CH / 2, 150, 0, Math.PI * 2);
        g.fillStyle = '#edf3fc';
        g.fill();
    }
    pintarDatos();
    const matDatos = matPantalla(lDatos, 0.12);
    const capaDatos = placa(marcoClaro, matDatos);

    // Los textos usan Inter, la letra de la web: si aún no había cargado al
    // pintar, se repintan cuando llega para no quedarse con la de reserva.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            pintarInterfaz(); matInterfaz.map.needsUpdate = true;
            pintarDatos(); matDatos.map.needsUpdate = true;
            ultimoCodigo = -1;
        });
    }

    // Base de datos: tres discos metálicos con aros de luz entre ellos
    const geoDisco = new CylinderGeometry(0.34, 0.34, 0.13, 56);
    const geoAro = new TorusGeometry(0.338, 0.012, 8, 72).rotateX(Math.PI / 2);
    const matAro = matLuz(0x7fb0ff);
    const discos = [];
    const xDB = enX(800), zDB = enZ(CH / 2);
    for (let i = 0; i < 3; i++) {
        const disco = new Mesh(geoDisco, metalAzul.clone());
        disco.material.color.set(i === 1 ? AZUL_CLARO : AZUL);
        disco.castShadow = disco.receiveShadow = true;
        const aro = new Mesh(geoAro, matAro);
        aro.position.y = 0.08;
        disco.add(aro);
        capaDatos.add(disco);
        discos.push(disco);
    }

    // Orden de llegada: de abajo arriba, como se construye una aplicación
    const capas = [capaDatos, capaLogica, capaInterfaz];
    capas.forEach((c) => raiz.add(c));

    /* --- Postes de acero entre las placas y paquetes de datos que los recorren --- */
    const ESQUINAS = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
        [a * (ANCHO / 2 - 0.16), b * (FONDO / 2 - 0.16)]);
    const postes = ESQUINAS.map(([x, z]) => {
        const p = new Mesh(new CylinderGeometry(0.016, 0.016, 1, 14).translate(0, 0.5, 0), acero);
        p.position.set(x, 0, z);
        p.castShadow = true;
        raiz.add(p);
        return p;
    });
    const POR_POSTE = 2;
    const NPAQ = ESQUINAS.length * POR_POSTE;
    const paquetes = new InstancedMesh(new SphereGeometry(0.034, 16, 12), matLuz(0x6fb0ff), NPAQ);
    paquetes.frustumCulled = false;
    raiz.add(paquetes);
    const oPaquete = new Object3D();

    const textura = texturaPunto();
    // Halo de cada paquete: luz que "sangra" alrededor, como en una foto
    const posHalos = new Float32Array(NPAQ * 3);
    const geoHalos = new BufferGeometry();
    geoHalos.setAttribute('position', new BufferAttribute(posHalos, 3));
    const halos = new Points(geoHalos, new PointsMaterial({
        color: AZUL_CLARO, size: 0.3, map: textura, transparent: true, opacity: 0.45,
        depthWrite: false, toneMapped: false
    }));
    halos.frustumCulled = false;
    raiz.add(halos);

    // Polvo en suspensión: motas que suben despacio por la luz
    const MOTAS = MOVIL ? 45 : 110;
    const posMotas = new Float32Array(MOTAS * 3);
    const semilla = new Float32Array(MOTAS);
    for (let i = 0; i < MOTAS; i++) {
        posMotas.set([(Math.random() - 0.5) * 5, Math.random() * 4 - 2, (Math.random() - 0.5) * 3.6], i * 3);
        semilla[i] = Math.random() * 10;
    }
    const geoMotas = new BufferGeometry();
    geoMotas.setAttribute('position', new BufferAttribute(posMotas, 3));
    const motas = new Points(geoMotas, new PointsMaterial({
        color: 0x8fb6ff, size: 0.035, map: textura, transparent: true, opacity: 0.6, depthWrite: false
    }));
    motas.frustumCulled = false;
    raiz.add(motas);

    /* --- Suelo invisible que solo muestra la sombra --- */
    const suelo = new Mesh(new PlaneGeometry(16, 16).rotateX(-Math.PI / 2),
        new ShadowMaterial({ color: 0x0a2a6b, opacity: 0.2 }));
    suelo.receiveShadow = true;
    raiz.add(suelo);

    /* --- Encuadre --- */
    function encuadrar(ancho, alto) {
        const aspecto = ancho / alto;
        // Más lejos cuanto más estrecho: la pila tiene que caber entera
        const distancia = aspecto < 1 ? 8.6 / Math.max(aspecto, 0.6) : 8.4;
        camara.fov = 30;
        camara.position.set(0, distancia * 0.56, distancia);
        camara.lookAt(0, -0.25, 0);
        camara.updateProjectionMatrix();
    }

    // Retroceso al final del vuelo: la placa se pasa un poco y vuelve (encaje)
    const rebote = (p) => {
        const c1 = 1.5, c3 = c1 + 1;
        return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    };
    const vaiven = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);   // ease-in-out

    let previo = 0, encima = 0;

    return {
        redimensionar: encuadrar,
        actualizar(t) {
            const tt = QUIETO ? 9 : t;
            const dt = Math.min(Math.max(tt - previo, 0), 0.05);
            previo = tt;

            // Ratón encima del lienzo: la pila se abre (vista despiezada) y se inclina más
            encima += ((estado.punteroActivo ? 1 : 0) - encima) * (QUIETO ? 1 : 0.05);

            // Separación entre placas: respira, se abre con el ratón y al bajar por la página
            const hueco = 1.1 + (QUIETO ? 0 : Math.sin(tt * 0.5) * 0.14) + encima * 0.28 + estado.scroll * 0.45;
            const alturas = [-hueco, 0, hueco];

            capas.forEach((c, i) => {
                // Empiezan a llegar desde el primer fotograma: el dibujo CSS de
                // respaldo se apaga en cuanto hay lienzo y no debe quedar un hueco
                const p = entre(tt, i * 0.3, 1.1 + i * 0.3);
                const r = rebote(p);
                // Cada placa flota a su ritmo, con un balanceo leve
                const flota = QUIETO ? 0 : Math.sin(tt * 0.8 + i * 1.7) * 0.06;
                c.position.y = alturas[i] + flota + (1 - r) * (2.4 + i * 0.6);
                c.rotation.y = (1 - r) * 0.9;
                c.rotation.z = (QUIETO ? 0 : Math.sin(tt * 0.6 + i) * 0.022) + (1 - r) * 0.25;
                c.rotation.x = QUIETO ? 0 : Math.cos(tt * 0.5 + i * 2) * 0.02;
            });

            // La gráfica crece cuando ya llegó su placa
            moverBarras(tt, suavizar(entre(tt, 1.4, 2.3)));

            // Código: 0–6,5 s escribe, 6,5–9 s se queda, 9–10 s se borra (de 3 en 3
            // letras: la textura se sube menos veces y sigue pareciendo tecleo)
            const ciclo = QUIETO ? 7 : Math.max(tt - 1.1, 0) % 10;
            const avance = ciclo < 6.5 ? ciclo / 6.5 : ciclo < 9 ? 1 : 1 - (ciclo - 9);
            pintarCodigo(Math.floor(avance * TOTAL / 3) * 3, QUIETO || Math.floor(tt * 2.4) % 2 === 0);

            // Cursor: viaja de una zona a otra, hace clic y la zona se ilumina
            const enCurso = Math.max(tt - 2.4, 0) / PASO;
            const parada = Math.floor(enCurso) % TARJETAS.length;
            const f = enCurso % 1;                       // 0–0,6 viaja, 0,6–1 clic y espera
            const [ax, az] = centro((parada + TARJETAS.length - 1) % TARJETAS.length);
            const [bx, bz] = centro(parada);
            const v = vaiven(Math.min(f / 0.6, 1));
            const clic = f > 0.6 ? Math.sin(Math.min((f - 0.6) / 0.15, 1) * Math.PI) : 0;
            cursor3d.position.set(MathUtils.lerp(ax, bx, v), ARRIBA + 0.07 - clic * 0.05, MathUtils.lerp(az, bz, v));
            cursor3d.visible = tt > 2.2;
            resaltes.forEach((m, i) => {
                const objetivo = i === parada && f > 0.62 ? 0.16 : 0;
                m.material.opacity += (objetivo - m.material.opacity) * 0.12;
            });

            // Discos de la base de datos: se separan y juntan en ola; los aros laten
            discos.forEach((d, i) => {
                const ola = QUIETO ? 0 : Math.max(0, Math.sin(tt * 1.6 - i * 0.7)) * 0.035;
                d.position.set(xDB, ARRIBA + 0.065 + i * (0.16 + ola), zDB);
            });
            matAro.color.setHSL(0.6, 1, 0.62 + (QUIETO ? 0 : Math.sin(tt * 2.2) * 0.12));

            // Postes: de la cara de arriba de "datos" a la de abajo de "interfaz"
            const base = capas[0].position.y + ARRIBA;
            const techo = capas[2].position.y - BISEL;
            const largo = Math.max(techo - base, 0.001) * suavizar(entre(tt, 1.6, 2.3));
            postes.forEach((p) => {
                p.position.y = base;
                p.scale.y = largo;
            });

            // Paquetes: suben y bajan por los postes (peticiones y respuestas)
            const aparecen = suavizar(entre(tt, 2.1, 2.7));
            ESQUINAS.forEach(([x, z], k) => {
                for (let j = 0; j < POR_POSTE; j++) {
                    const i = k * POR_POSTE + j;
                    const fase = ((QUIETO ? 0.35 : tt * 0.4) + k * 0.27 + j * 0.5) % 1;
                    const fp = j % 2 ? fase : 1 - fase;
                    const tam = aparecen * Math.sin(Math.PI * fp);   // nacen y mueren en los extremos
                    oPaquete.position.set(x, base + largo * fp, z);
                    oPaquete.scale.setScalar(tam);
                    oPaquete.updateMatrix();
                    paquetes.setMatrixAt(i, oPaquete.matrix);
                    // El halo solo se ve cuando el paquete ya tiene tamaño
                    posHalos.set(tam > 0.35 ? [x, base + largo * fp, z] : [0, -100, 0], i * 3);
                }
            });
            paquetes.instanceMatrix.needsUpdate = true;
            geoHalos.attributes.position.needsUpdate = true;

            // Motas: suben despacio, ondulando; al salir por arriba vuelven abajo
            if (!QUIETO) {
                for (let i = 0; i < MOTAS; i++) {
                    const j = i * 3;
                    posMotas[j] += Math.sin(tt * 0.4 + semilla[i]) * 0.0015;
                    posMotas[j + 1] += dt * (0.08 + (semilla[i] % 1) * 0.08);
                    if (posMotas[j + 1] > 2.2) posMotas[j + 1] = -2;
                }
                geoMotas.attributes.position.needsUpdate = true;
            }

            suelo.position.y = capas[0].position.y - 0.85;

            // La luz se desplaza despacio: los brillos recorren las superficies
            if (!QUIETO) {
                luz.position.set(-3 + Math.sin(tt * 0.18) * 2.4, 8, 4 + Math.cos(tt * 0.15) * 1.6);
            }

            // Orientación: vista isométrica que se mece, sigue al puntero y gira al bajar
            const seguir = 0.25 + encima * 0.15;
            raiz.rotation.y = -0.62 + (QUIETO ? 0 : Math.sin(tt * 0.22) * 0.22)
                + estado.punteroSuave.x * seguir + estado.scroll * 0.35;
            raiz.rotation.x = estado.punteroSuave.y * (0.06 + encima * 0.05) + (QUIETO ? 0 : Math.sin(tt * 0.3) * 0.03);
            raiz.position.y = QUIETO ? 0 : Math.sin(tt * 0.7) * 0.06;
        }
    };
}

/* =========================================================
   Escena "red": fondos oscuros
   ========================================================= */

function escenaRed({ escena, camara, estado }) {
    const N = MOVIL ? 54 : 110;
    const ALCANCE = 2.1;                                  // distancia máxima para unir dos nodos
    const MAX_SEGMENTOS = N * 8;
    const PULSOS = MOVIL ? 4 : 8;

    let anchoMundo = 16, altoMundo = 9;

    const raiz = new Group();
    escena.add(raiz);

    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        pos.set([(Math.random() - 0.5) * anchoMundo, (Math.random() - 0.5) * altoMundo,
            -Math.random() * 3], i * 3);
        vel.set([(Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18,
            (Math.random() - 0.5) * 0.04], i * 3);
    }

    const textura = texturaPunto();

    const geoNodos = new BufferGeometry();
    geoNodos.setAttribute('position', new BufferAttribute(pos, 3));
    const nodos = new Points(geoNodos, new PointsMaterial({
        color: AZUL_CLARO, size: 0.13, map: textura, transparent: true, opacity: 0.85,
        depthWrite: false, blending: AdditiveBlending
    }));
    nodos.frustumCulled = false;
    raiz.add(nodos);

    // Segmentos: búfer reservado de antemano; cada fotograma se rellena con los
    // pares que estén cerca y se dibuja solo esa parte (setDrawRange).
    const posLineas = new Float32Array(MAX_SEGMENTOS * 2 * 3);
    const colLineas = new Float32Array(MAX_SEGMENTOS * 2 * 3);
    const geoLineas = new BufferGeometry();
    geoLineas.setAttribute('position', new BufferAttribute(posLineas, 3));
    geoLineas.setAttribute('color', new BufferAttribute(colLineas, 3));
    const lineas = new LineSegments(geoLineas, new LineBasicMaterial({
        vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending
    }));
    lineas.frustumCulled = false;
    raiz.add(lineas);
    const base = new Color(AZUL_CLARO);

    // Pulsos: paquetes que saltan de un nodo a un vecino
    const posPulsos = new Float32Array(PULSOS * 3);
    const geoPulsos = new BufferGeometry();
    geoPulsos.setAttribute('position', new BufferAttribute(posPulsos, 3));
    const puntosPulso = new Points(geoPulsos, new PointsMaterial({
        color: 0xbfd8ff, size: 0.2, map: textura, transparent: true,
        depthWrite: false, blending: AdditiveBlending
    }));
    puntosPulso.frustumCulled = false;
    raiz.add(puntosPulso);
    const pulsos = Array.from({ length: PULSOS }, () => ({
        de: Math.floor(Math.random() * N), a: -1, f: Math.random()
    }));

    function vecinoCercano(i) {
        let mejor = -1, mejorD = Infinity;
        for (let k = 0; k < 12; k++) {
            const j = Math.floor(Math.random() * N);
            if (j === i) continue;
            const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1];
            const d = dx * dx + dy * dy;
            if (d < mejorD) { mejorD = d; mejor = j; }
        }
        return mejor;
    }

    function encuadrar(ancho, alto) {
        camara.fov = 50;
        camara.position.set(0, 0, 10);
        camara.lookAt(0, 0, 0);
        camara.updateProjectionMatrix();
        altoMundo = 2 * 10 * Math.tan(MathUtils.degToRad(25));
        anchoMundo = altoMundo * (ancho / alto);
    }

    let previo = 0;

    return {
        redimensionar: encuadrar,
        actualizar(t) {
            const dt = Math.min(t - previo, 0.05);
            previo = t;
            const mx = anchoMundo / 2 + 1, my = altoMundo / 2 + 1;

            for (let i = 0; i < N; i++) {
                const j = i * 3;
                pos[j] += vel[j] * dt;
                pos[j + 1] += vel[j + 1] * dt;
                pos[j + 2] = MathUtils.clamp(pos[j + 2] + vel[j + 2] * dt, -3, 0);
                // Al salir por un borde reaparece por el contrario
                if (pos[j] > mx) pos[j] = -mx; else if (pos[j] < -mx) pos[j] = mx;
                if (pos[j + 1] > my) pos[j + 1] = -my; else if (pos[j + 1] < -my) pos[j + 1] = my;
            }
            geoNodos.attributes.position.needsUpdate = true;

            let s = 0;
            const r2 = ALCANCE * ALCANCE;
            for (let i = 0; i < N && s < MAX_SEGMENTOS; i++) {
                for (let k = i + 1; k < N && s < MAX_SEGMENTOS; k++) {
                    const dx = pos[i * 3] - pos[k * 3];
                    const dy = pos[i * 3 + 1] - pos[k * 3 + 1];
                    const dz = pos[i * 3 + 2] - pos[k * 3 + 2];
                    const d2 = dx * dx + dy * dy + dz * dz;
                    if (d2 > r2) continue;
                    // Con mezcla aditiva, oscurecer el color equivale a bajar la opacidad
                    const fuerza = (1 - Math.sqrt(d2) / ALCANCE) * 0.55;
                    posLineas.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
                        pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]], s * 6);
                    colLineas.set([base.r * fuerza, base.g * fuerza, base.b * fuerza,
                        base.r * fuerza, base.g * fuerza, base.b * fuerza], s * 6);
                    s++;
                }
            }
            geoLineas.setDrawRange(0, s * 2);
            geoLineas.attributes.position.needsUpdate = true;
            geoLineas.attributes.color.needsUpdate = true;

            pulsos.forEach((p, i) => {
                if (p.a < 0) p.a = vecinoCercano(p.de);
                p.f += dt * 0.8;
                if (p.f >= 1) { p.de = p.a; p.a = vecinoCercano(p.de); p.f = 0; }
                const a = p.de * 3, b = p.a * 3, f = suavizar(p.f);
                posPulsos[i * 3] = MathUtils.lerp(pos[a], pos[b], f);
                posPulsos[i * 3 + 1] = MathUtils.lerp(pos[a + 1], pos[b + 1], f);
                posPulsos[i * 3 + 2] = MathUtils.lerp(pos[a + 2], pos[b + 2], f);
            });
            geoPulsos.attributes.position.needsUpdate = true;

            // Paralaje leve con el puntero
            raiz.rotation.y = estado.punteroSuave.x * 0.08;
            raiz.rotation.x = -estado.punteroSuave.y * 0.05;
        }
    };
}

/* =========================================================
   Escena "antigravedad": fondo claro del Portafolio
   ========================================================= */

function escenaAntigravedad({ escena, camara, estado, opciones }) {
    const densidad = opciones.densidad, escala = opciones.escala;
    const MAX = Math.round((MOVIL ? 520 : 1400) * densidad);
    // Hueco entre cápsulas en la rejilla: el doble de densidad es el doble de
    // cápsulas por área, así que el lado de cada celda se divide por su raíz
    const SEPARACION = (MOVIL ? 0.66 : 0.52) / Math.sqrt(densidad);
    const RADIO = MOVIL ? 1.5 : 1.9;                       // alcance del puntero
    const COLORES = [AZUL, AZUL_CLARO, 0x6fa4ff, AZUL_PROFUNDO, 0x9cc2ff];

    // Las del fondo se funden con el gris de la sección (--gris-01): da profundidad
    // sin luces. MeshBasicMaterial respeta la niebla por defecto.
    escena.fog = new Fog(0xf6f9fd, 9, 14);

    const capsulas = new InstancedMesh(new CapsuleGeometry(0.038 * escala, 0.16 * escala, 3, 8),
        new MeshBasicMaterial({ color: 0xffffff }), MAX);
    capsulas.frustumCulled = false;                        // se mueven por toda la sección
    escena.add(capsulas);

    const casa = new Float32Array(MAX * 3);                // posición de reposo
    const fase = new Float32Array(MAX);                    // desfase del flotar
    const giro = new Float32Array(MAX);                    // ángulo acumulado alrededor del puntero
    let total = 0;
    let anchoMundo = 16, altoMundo = 9;

    const raton = new Vector2();                           // puntero en el plano z = 0, suavizado
    const objetivo = new Vector2();
    const o = new Object3D();

    /** Rejilla con temblor que cubre todo el lienzo; se rehace al cambiar de tamaño. */
    function sembrar() {
        // Si no caben todas, se separan más en vez de dejar una franja vacía
        const sep = Math.max(SEPARACION, Math.sqrt(anchoMundo * altoMundo / MAX) * 1.08);
        const cols = Math.ceil(anchoMundo / sep) + 2;
        const filas = Math.ceil(altoMundo / sep) + 2;
        total = Math.min(cols * filas, MAX);
        const c = new Color();
        for (let i = 0; i < total; i++) {
            const col = i % cols, fila = Math.floor(i / cols);
            casa[i * 3] = (col - (cols - 1) / 2) * sep + (Math.random() - 0.5) * sep * 0.7;
            casa[i * 3 + 1] = (fila - (filas - 1) / 2) * sep + (Math.random() - 0.5) * sep * 0.7;
            casa[i * 3 + 2] = 0.4 - Math.random() * 2.6;
            fase[i] = Math.random() * Math.PI * 2;
            giro[i] = 0;
            capsulas.setColorAt(i, c.set(COLORES[Math.floor(Math.random() * COLORES.length)]));
        }
        capsulas.count = total;
        capsulas.instanceColor.needsUpdate = true;
    }

    function encuadrar(ancho, alto) {
        camara.fov = 50;
        camara.position.set(0, 0, 10);
        camara.lookAt(0, 0, 0);
        camara.updateProjectionMatrix();
        altoMundo = 2 * 10 * Math.tan(MathUtils.degToRad(25));
        anchoMundo = altoMundo * (ancho / alto);
        sembrar();
    }

    let previo = 0;

    return {
        redimensionar: encuadrar,
        actualizar(t) {
            const dt = Math.min(t - previo, 0.05);
            previo = t;

            // Con ratón encima, lo sigue. Si no (móvil, o el ratón está en otra
            // parte), un "puntero fantasma" recorre la sección despacio para que
            // el efecto también se vea.
            if (estado.punteroActivo) {
                objetivo.set(estado.punteroLocal.x * anchoMundo / 2, estado.punteroLocal.y * altoMundo / 2);
            } else {
                objetivo.set(Math.sin(t * 0.21) * anchoMundo * 0.28, Math.cos(t * 0.17) * altoMundo * 0.22);
            }
            raton.lerp(objetivo, QUIETO ? 1 : 0.08);

            const r2max = RADIO * RADIO;
            for (let i = 0; i < total; i++) {
                const j = i * 3;
                const hx = casa[j] + (QUIETO ? 0 : Math.sin(t * 0.6 + fase[i]) * 0.04);
                const hy = casa[j + 1] + (QUIETO ? 0 : Math.cos(t * 0.5 + fase[i] * 1.3) * 0.04);
                const dx = hx - raton.x, dy = hy - raton.y;
                const f = Math.exp(-(dx * dx + dy * dy) / r2max);   // 1 junto al puntero, 0 lejos

                // Cerca: orbitan. Lejos: el giro se deshace y vuelven a su sitio.
                // El ángulo se mantiene en (-π, π]: girar 2π deja la cápsula donde
                // estaba, así que el recorte no produce saltos.
                let a = giro[i] + f * 2.4 * dt;
                a *= Math.exp(-dt * 1.4 * (1 - f));
                if (a > Math.PI) a -= Math.PI * 2;
                giro[i] = a;

                const cos = Math.cos(a), sin = Math.sin(a);
                const empuje = 1 + f * 0.35;                         // se abren un poco
                const px = raton.x + (dx * cos - dy * sin) * empuje;
                const py = raton.y + (dx * sin + dy * cos) * empuje;

                o.position.set(px, py, casa[j + 2] + f * 0.45);      // y se elevan hacia la cámara
                // Orientadas en tangente a los anillos alrededor del puntero (la
                // cápsula va a lo largo de Y; girarla el ángulo radial la deja tangente)
                o.rotation.set(0, 0, Math.atan2(py - raton.y, px - raton.x));
                o.scale.setScalar(0.6 + f * 0.75);
                o.updateMatrix();
                capsulas.setMatrixAt(i, o.matrix);
            }
            capsulas.instanceMatrix.needsUpdate = true;

            // Paralaje leve de la cámara con el puntero
            camara.position.x = estado.punteroSuave.x * 0.35;
            camara.position.y = -estado.punteroSuave.y * 0.2;
            camara.lookAt(0, 0, 0);
        }
    };
}

const ESCENAS = { pila: escenaPila, red: escenaRed, antigravedad: escenaAntigravedad, particulas: escenaParticulas };

/* =========================================================
   Montaje: un lienzo por contenedor
   ========================================================= */

/* El puntero se comparte entre todas las escenas: -1..1 respecto al centro */
const puntero = new Vector2();
/* Y en píxeles de pantalla, para las escenas que reaccionan a dónde está
   el ratón DENTRO de su lienzo (antigravedad). Solo cuenta el ratón: con el
   dedo, el gesto es desplazar la página, no "tocar" el fondo. */
const cliente = { x: -1e5, y: -1e5, raton: false };
window.addEventListener('pointermove', (e) => {
    puntero.set(e.clientX / window.innerWidth * 2 - 1, e.clientY / window.innerHeight * 2 - 1);
    cliente.x = e.clientX;
    cliente.y = e.clientY;
    cliente.raton = e.pointerType === 'mouse';
}, { passive: true });
document.addEventListener('mouseleave', () => { cliente.x = cliente.y = -1e5; });

export function montarEscena(caja, nombre) {
    const fabrica = ESCENAS[nombre];
    if (!fabrica) return () => {};
    const estatico = QUIETO || caja.getAttribute('data-estatico') === 'si';

    let renderer;
    try {
        renderer = new WebGLRenderer({
            antialias: window.devicePixelRatio < 2,
            alpha: true,
            powerPreference: 'low-power'
        });
    } catch {
        return () => {};                                   // sin WebGL: queda el fondo CSS
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MOVIL ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);
    const lienzo = renderer.domElement;
    lienzo.setAttribute('aria-hidden', 'true');
    caja.appendChild(lienzo);

    const escena = new Scene();
    const camara = new PerspectiveCamera(35, 1, 0.1, 100);
    const estado = { punteroSuave: new Vector2(), scroll: 0, punteroLocal: new Vector2(), punteroActivo: false };
    const opciones = {
        densidad: parseFloat(caja.getAttribute('data-densidad')) || 1,
        escala: parseFloat(caja.getAttribute('data-escala')) || 1
    };
    const app = fabrica({ escena, camara, estado, opciones, renderer });

    const timer = new Timer();
    timer.connect(document);                               // congela el tiempo con la pestaña oculta
    let listo = false;

    function leerPosicion() {
        const r = caja.getBoundingClientRect();
        // 0 cuando el contenedor está entero a la vista, 1 cuando ya salió por arriba
        estado.scroll = MathUtils.clamp(-r.top / Math.max(r.height, 1), 0, 1);
        // Puntero relativo al lienzo, -1..1 con Y hacia arriba. Se recalcula cada
        // fotograma: al hacer scroll con el ratón quieto, el lienzo se mueve debajo.
        estado.punteroLocal.set((cliente.x - r.left) / r.width * 2 - 1, 1 - (cliente.y - r.top) / r.height * 2);
        estado.punteroActivo = cliente.raton && Math.abs(estado.punteroLocal.x) <= 1 && Math.abs(estado.punteroLocal.y) <= 1;
    }

    function dibujar(t) {
        app.actualizar(t);
        renderer.render(escena, camara);
        if (!listo) {
            listo = true;
            caja.classList.add('listo');
        }
    }

    function cuadro() {
        timer.update();
        estado.punteroSuave.lerp(puntero, 0.05);
        leerPosicion();
        dibujar(timer.getElapsed());
    }

    const observadorTamano = new ResizeObserver(([entrada]) => {
        const { width, height } = entrada.contentRect;
        if (!width || !height) return;
        renderer.setSize(width, height, false);           // el tamaño CSS lo pone estilo.css
        camara.aspect = width / height;
        camara.updateProjectionMatrix();
        app.redimensionar(width, height);
        if (estatico) dibujar(8);                          // ya armada: entrada terminada
    });
    observadorTamano.observe(caja);

    // Solo anima mientras se ve. Al volver, el reloj sigue donde estaba.
    let observadorVisible = null;
    if (!estatico) {
        observadorVisible = new IntersectionObserver(([e]) => {
            renderer.setAnimationLoop(e.isIntersecting ? cuadro : null);
        }, { rootMargin: '120px 0px' });
        observadorVisible.observe(caja);
    }

    return function desmontar() {
        renderer.setAnimationLoop(null);
        observadorVisible?.disconnect();
        observadorTamano.disconnect();
        timer.dispose();
        escena.traverse((objeto) => {
            objeto.geometry?.dispose();
            const materiales = Array.isArray(objeto.material) ? objeto.material : [objeto.material];
            for (const material of materiales) {
                if (!material) continue;
                for (const valor of Object.values(material)) if (valor?.isTexture) valor.dispose();
                material.dispose();
            }
        });
        renderer.dispose();
        renderer.forceContextLoss();
        lienzo.remove();
        caja.classList.remove('listo');
    };
}
