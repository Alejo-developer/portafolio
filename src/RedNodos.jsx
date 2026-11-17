import { useEffect, useRef } from "react";
import * as THREE from "three";

// Red de nodos 3D del inicio: puntos que flotan como luces de la ciudad de noche
// y se unen con líneas cuando están cerca. El cursor actúa como un nodo más.

const COLOR_ENLACE = new THREE.Color("#6d8bff");
const COLOR_SODIO = new THREE.Color("#ffb547");
const COLOR_PAPEL = new THREE.Color("#eef1f8");

const DISTANCIA_ENLACE = 1.35;
const DISTANCIA_CURSOR = 2.1;
const PROFUNDIDAD = 3;

// Textura circular con halo para que cada punto se vea como una luz
function crearTexturaLuz() {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext("2d");
  const degradado = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  degradado.addColorStop(0, "rgba(255,255,255,1)");
  degradado.addColorStop(0.25, "rgba(255,255,255,0.85)");
  degradado.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = degradado;
  ctx.fillRect(0, 0, 64, 64);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

export default function RedNodos() {
  const contenedorRef = useRef(null);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const esMovil = window.matchMedia("(max-width: 720px)").matches;
    const cantidad = esMovil ? 70 : 150;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    contenedor.appendChild(renderer.domElement);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(60, 1, 0.1, 50);
    camara.position.set(0, 0, 7);

    // Límites del volumen donde flotan los nodos; se recalculan con el tamaño de la pantalla
    const limites = new THREE.Vector3(6, 3.5, PROFUNDIDAD);

    // Nodos
    const posiciones = new Float32Array(cantidad * 3);
    const velocidades = new Float32Array(cantidad * 3);
    const coloresNodos = new Float32Array(cantidad * 3);
    for (let i = 0; i < cantidad; i++) {
      posiciones[i * 3] = THREE.MathUtils.randFloatSpread(2 * limites.x);
      posiciones[i * 3 + 1] = THREE.MathUtils.randFloatSpread(2 * limites.y);
      posiciones[i * 3 + 2] = THREE.MathUtils.randFloatSpread(2 * limites.z);
      velocidades[i * 3] = THREE.MathUtils.randFloatSpread(0.25);
      velocidades[i * 3 + 1] = THREE.MathUtils.randFloatSpread(0.25);
      velocidades[i * 3 + 2] = THREE.MathUtils.randFloatSpread(0.1);
      // Casi todas las luces son de sodio; unas pocas blancas dan variedad
      const color = Math.random() < 0.8 ? COLOR_SODIO : COLOR_PAPEL;
      color.toArray(coloresNodos, i * 3);
    }

    const geometriaNodos = new THREE.BufferGeometry();
    geometriaNodos.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
    geometriaNodos.setAttribute("color", new THREE.BufferAttribute(coloresNodos, 3));
    const texturaLuz = crearTexturaLuz();
    const materialNodos = new THREE.PointsMaterial({
      size: esMovil ? 0.16 : 0.13,
      map: texturaLuz,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const nodos = new THREE.Points(geometriaNodos, materialNodos);
    escena.add(nodos);

    // Enlaces: buffer reservado de antemano y reescrito cada cuadro
    const maxEnlaces = cantidad * 6;
    const posicionesEnlaces = new Float32Array(maxEnlaces * 6);
    const coloresEnlaces = new Float32Array(maxEnlaces * 6);
    const geometriaEnlaces = new THREE.BufferGeometry();
    geometriaEnlaces.setAttribute(
      "position",
      new THREE.BufferAttribute(posicionesEnlaces, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometriaEnlaces.setAttribute(
      "color",
      new THREE.BufferAttribute(coloresEnlaces, 3).setUsage(THREE.DynamicDrawUsage),
    );
    const materialEnlaces = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const enlaces = new THREE.LineSegments(geometriaEnlaces, materialEnlaces);
    enlaces.frustumCulled = false;
    escena.add(enlaces);

    // Cursor proyectado sobre el plano z = 0
    const cursor = new THREE.Vector3();
    const cursorNdc = new THREE.Vector2();
    let cursorActivo = false;
    const rayo = new THREE.Raycaster();
    const plano = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    const temporal = new THREE.Color();
    function escribirEnlace(indice, ax, ay, az, bx, by, bz, color, intensidad) {
      const o = indice * 6;
      posicionesEnlaces[o] = ax;
      posicionesEnlaces[o + 1] = ay;
      posicionesEnlaces[o + 2] = az;
      posicionesEnlaces[o + 3] = bx;
      posicionesEnlaces[o + 4] = by;
      posicionesEnlaces[o + 5] = bz;
      // Con mezcla aditiva, oscurecer el color equivale a hacerlo más transparente
      temporal.copy(color).multiplyScalar(intensidad);
      temporal.toArray(coloresEnlaces, o);
      temporal.toArray(coloresEnlaces, o + 3);
    }

    function actualizarEnlaces() {
      let total = 0;
      for (let i = 0; i < cantidad && total < maxEnlaces; i++) {
        const ax = posiciones[i * 3];
        const ay = posiciones[i * 3 + 1];
        const az = posiciones[i * 3 + 2];
        for (let j = i + 1; j < cantidad && total < maxEnlaces; j++) {
          const dx = ax - posiciones[j * 3];
          const dy = ay - posiciones[j * 3 + 1];
          const dz = az - posiciones[j * 3 + 2];
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < DISTANCIA_ENLACE) {
            const intensidad = (1 - d / DISTANCIA_ENLACE) * 0.55;
            escribirEnlace(total++, ax, ay, az, posiciones[j * 3], posiciones[j * 3 + 1], posiciones[j * 3 + 2], COLOR_ENLACE, intensidad);
          }
        }
        if (cursorActivo && total < maxEnlaces) {
          const dx = ax - cursor.x;
          const dy = ay - cursor.y;
          const dz = az - cursor.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < DISTANCIA_CURSOR) {
            const intensidad = (1 - d / DISTANCIA_CURSOR) * 0.9;
            escribirEnlace(total++, ax, ay, az, cursor.x, cursor.y, cursor.z, COLOR_SODIO, intensidad);
          }
        }
      }
      geometriaEnlaces.setDrawRange(0, total * 2);
      geometriaEnlaces.attributes.position.needsUpdate = true;
      geometriaEnlaces.attributes.color.needsUpdate = true;
    }

    function moverNodos(delta) {
      for (let i = 0; i < cantidad; i++) {
        for (let eje = 0; eje < 3; eje++) {
          const k = i * 3 + eje;
          posiciones[k] += velocidades[k] * delta;
          const limite = limites.getComponent(eje);
          if (posiciones[k] > limite || posiciones[k] < -limite) {
            velocidades[k] *= -1;
            posiciones[k] = THREE.MathUtils.clamp(posiciones[k], -limite, limite);
          }
        }
      }
      geometriaNodos.attributes.position.needsUpdate = true;
    }

    function ajustarTamano() {
      const ancho = contenedor.clientWidth;
      const alto = contenedor.clientHeight;
      if (!ancho || !alto) return;
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      camara.updateProjectionMatrix();
      // Llena todo el ancho visible en el plano z = 0
      const altoVisible = 2 * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * camara.position.z;
      limites.set((altoVisible * camara.aspect) / 2 + 0.5, altoVisible / 2 + 0.3, PROFUNDIDAD);
    }

    function alMoverPuntero(evento) {
      const rect = contenedor.getBoundingClientRect();
      cursorNdc.set(
        ((evento.clientX - rect.left) / rect.width) * 2 - 1,
        -((evento.clientY - rect.top) / rect.height) * 2 + 1,
      );
      rayo.setFromCamera(cursorNdc, camara);
      cursorActivo = rayo.ray.intersectPlane(plano, cursor) !== null;
    }
    const alSalirPuntero = () => {
      cursorActivo = false;
    };

    const timer = new THREE.Timer();
    timer.connect(document);
    let desplazamiento = 0;

    function animar() {
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.05);
      const t = timer.getElapsed();
      moverNodos(delta);
      actualizarEnlaces();
      // Leve paralaje con el cursor y alejamiento al hacer scroll
      const objetivoX = cursorActivo ? cursorNdc.x * 0.35 : Math.sin(t * 0.1) * 0.2;
      const objetivoY = cursorActivo ? cursorNdc.y * 0.2 : 0;
      camara.position.x += (objetivoX - camara.position.x) * 0.03;
      camara.position.y += (objetivoY - camara.position.y) * 0.03;
      camara.position.z = 7 + desplazamiento * 2.5;
      camara.lookAt(0, 0, 0);
      renderer.render(escena, camara);
    }

    function alHacerScroll() {
      desplazamiento = THREE.MathUtils.clamp(window.scrollY / contenedor.clientHeight, 0, 1);
    }

    ajustarTamano();
    const observadorTamano = new ResizeObserver(ajustarTamano);
    observadorTamano.observe(contenedor);

    // Con movimiento reducido se dibuja un solo cuadro estático
    let observadorVisible;
    if (reducirMovimiento) {
      actualizarEnlaces();
      renderer.render(escena, camara);
    } else {
      window.addEventListener("pointermove", alMoverPuntero, { passive: true });
      document.addEventListener("pointerleave", alSalirPuntero);
      window.addEventListener("scroll", alHacerScroll, { passive: true });
      // Solo anima mientras el inicio está en pantalla
      observadorVisible = new IntersectionObserver(([entrada]) => {
        renderer.setAnimationLoop(entrada.isIntersecting ? animar : null);
      });
      observadorVisible.observe(contenedor);
    }

    return () => {
      renderer.setAnimationLoop(null);
      observadorVisible?.disconnect();
      observadorTamano.disconnect();
      window.removeEventListener("pointermove", alMoverPuntero);
      document.removeEventListener("pointerleave", alSalirPuntero);
      window.removeEventListener("scroll", alHacerScroll);
      timer.dispose();
      geometriaNodos.dispose();
      geometriaEnlaces.dispose();
      materialNodos.dispose();
      materialEnlaces.dispose();
      texturaLuz.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={contenedorRef} className="red-nodos" aria-hidden="true" />;
}
