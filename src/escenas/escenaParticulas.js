/* =====================================================================
   Partículas de FyA MicroApps (three.js r186, ShaderMaterial)

   Adaptada del fondo 3D de fyamicroapps.netlify.app para vivir dentro
   de una tarjeta del portafolio:
   - Partículas en forma de "rayita" dibujadas en un shader.
   - En la web cambian de forma con el scroll; aquí recorren solas
     esfera → anillo → ola → galaxia, de ida y vuelta.
   - Cerca del ratón se iluminan, crecen, se apartan y miran hacia él.

   Sigue el mismo contrato que las escenas de escenasFya.js:
   recibe { escena, camara, estado, renderer } y devuelve
   { actualizar(t), redimensionar(ancho, alto) }.
   ===================================================================== */
import {
  BufferGeometry, BufferAttribute, ShaderMaterial, Points, Group, Color, Vector2, Vector3, Euler,
  AdditiveBlending, MathUtils,
} from 'three';

const QUIETO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOVIL = window.matchMedia('(max-width: 760px)').matches;

// Orden de formas: ida y vuelta para no saltar de la galaxia a la esfera
const SECUENCIA = [0, 1, 2, 3, 2, 1];
const SEGUNDOS_POR_FORMA = 3.5;

export function escenaParticulas({ escena, camara, estado, renderer }) {
  camara.fov = 50;
  camara.position.set(0, 0, 9);
  camara.lookAt(0, 0, 0);

  /* ---------- Formas ---------- */
  const N = MOVIL ? 2400 : 4500;
  const A = new Float32Array(N * 3); // esfera
  const B = new Float32Array(N * 3); // anillo
  const C = new Float32Array(N * 3); // ola
  const D = new Float32Array(N * 3); // galaxia
  const R = new Float32Array(N);     // aleatorio por partícula
  const aureo = Math.PI * (3 - Math.sqrt(5));
  const columnas = Math.ceil(Math.sqrt(N * 2.4));
  const filas = Math.ceil(N / columnas);
  const inclinacionB = new Euler(1.15, 0, 0.25);
  const inclinacionD = new Euler(0.95, 0, -0.2);
  const v = new Vector3();

  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    R[i] = Math.random();

    // A · esfera (Fibonacci) con algo de grosor
    const y = 1 - (i / (N - 1)) * 2;
    const radio = Math.sqrt(1 - y * y);
    const th = aureo * i;
    const sr = 3.2 + (Math.random() - 0.5) * 0.55;
    A[i3] = Math.cos(th) * radio * sr; A[i3 + 1] = y * sr; A[i3 + 2] = Math.sin(th) * radio * sr;

    // B · anillo inclinado
    const u = Math.random() * Math.PI * 2, w = Math.random() * Math.PI * 2;
    const tubo = 0.25 + Math.pow(Math.random(), 1.6) * 1.1;
    v.set((4.1 + tubo * Math.cos(w)) * Math.cos(u), tubo * Math.sin(w) * 0.55, (4.1 + tubo * Math.cos(w)) * Math.sin(u)).applyEuler(inclinacionB);
    B[i3] = v.x; B[i3 + 1] = v.y; B[i3 + 2] = v.z;

    // C · ola (malla ondulada)
    const gx = (i % columnas) / columnas, gz = Math.floor(i / columnas) / filas;
    const x = (gx - 0.5) * 14, z = (gz - 0.5) * 7 - 2.5;
    C[i3] = x + (Math.random() - 0.5) * 0.08;
    C[i3 + 1] = Math.sin(x * 0.55) * 0.55 + Math.cos(z * 0.8 + x * 0.2) * 0.45 - 0.8;
    C[i3 + 2] = z;

    // D · galaxia de 3 brazos
    const t = Math.pow(Math.random(), 0.8), brazo = i % 3;
    const ang = t * Math.PI * 3.2 + brazo * (Math.PI * 2 / 3);
    const rr = 0.35 + t * 4.6, dispersion = 0.15 + t * 0.55;
    v.set(Math.cos(ang) * rr + (Math.random() - 0.5) * dispersion, (Math.random() - 0.5) * 0.35 * (1.2 - t), Math.sin(ang) * rr + (Math.random() - 0.5) * dispersion).applyEuler(inclinacionD);
    D[i3] = v.x; D[i3 + 1] = v.y; D[i3 + 2] = v.z;
  }

  const geometria = new BufferGeometry();
  geometria.setAttribute('position', new BufferAttribute(A, 3));
  geometria.setAttribute('aB', new BufferAttribute(B, 3));
  geometria.setAttribute('aC', new BufferAttribute(C, 3));
  geometria.setAttribute('aD', new BufferAttribute(D, 3));
  geometria.setAttribute('aRand', new BufferAttribute(R, 1));

  /* ---------- Shader ---------- */
  const tamanoBase = MOVIL ? 12 : 13;
  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uMouse: { value: new Vector2(10, 10) },
    uHover: { value: 0 },
    uAspect: { value: 1 },
    uSize: { value: tamanoBase },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uColA: { value: new Color('#3d8bff') },
    uColB: { value: new Color('#bcd6ff') },
  };

  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aB;
      attribute vec3 aC;
      attribute vec3 aD;
      attribute float aRand;
      uniform float uTime, uMorph, uHover, uAspect, uSize, uPixelRatio;
      uniform vec2 uMouse;
      varying float vAlpha;
      varying float vAngle;
      varying float vGlow;

      void main() {
        // morph escalonado: cada partícula arranca un poco antes o después
        float m = uMorph + (aRand - 0.5) * 0.35;
        vec3 p = position;
        p = mix(p, aB, smoothstep(0.0, 1.0, clamp(m, 0.0, 1.0)));
        p = mix(p, aC, smoothstep(0.0, 1.0, clamp(m - 1.0, 0.0, 1.0)));
        p = mix(p, aD, smoothstep(0.0, 1.0, clamp(m - 2.0, 0.0, 1.0)));

        // flotación suave
        float t = uTime;
        p += 0.07 * vec3(sin(t * 0.8 + aRand * 40.0), cos(t * 0.7 + aRand * 25.0), sin(t * 0.6 + aRand * 13.0));

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec4 clip = projectionMatrix * mv;
        vec2 ndc = clip.xy / clip.w;

        // interacción con el ratón (en pantalla, corrigiendo el aspecto)
        vec2 d = (ndc - uMouse) * vec2(uAspect, 1.0);
        float dist = length(d);
        float f = smoothstep(0.42, 0.0, dist) * uHover;
        vec2 dir = d / max(dist, 1e-4);
        ndc += (dir * f * 0.16) / vec2(uAspect, 1.0);
        clip.xy = ndc * clip.w;
        gl_Position = clip;

        float depth = -mv.z;
        gl_PointSize = min(uSize * uPixelRatio * (0.55 + aRand * 0.9) * (1.0 + f * 1.6) * (7.0 / depth), 46.0 * uPixelRatio);
        vAlpha = ((0.1 + 0.32 * smoothstep(12.0, 4.0, depth)) * (0.75 + aRand * 0.5) + f * 0.85) * smoothstep(2.2, 4.5, depth);
        vGlow = f;

        // orientación: radial respecto al centro; cerca del cursor, hacia el cursor
        float radial = atan(ndc.y, ndc.x * uAspect);
        float haciaRaton = atan(d.y, d.x);
        vAngle = mix(radial, haciaRaton, smoothstep(0.0, 0.6, f));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColA;
      uniform vec3 uColB;
      varying float vAlpha;
      varying float vAngle;
      varying float vGlow;

      void main() {
        vec2 p = gl_PointCoord - 0.5;
        p.y = -p.y;
        float c = cos(vAngle), s = sin(vAngle);
        p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
        // cápsula (rayita) a lo largo de x
        vec2 q = vec2(max(abs(p.x) - 0.28, 0.0), p.y);
        float dc = length(q) - 0.085;
        float a = smoothstep(0.035, -0.005, dc) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(uColA, uColB, clamp(vGlow * 1.3, 0.0, 1.0)), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });

  const puntos = new Points(geometria, material);
  puntos.frustumCulled = false; // las posiciones finales salen del shader
  const grupo = new Group();
  grupo.add(puntos);
  escena.add(grupo);

  let tAnterior = 0;
  let morph = 0;

  return {
    redimensionar(ancho, alto) {
      uniforms.uAspect.value = ancho / alto;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
      // Las rayitas se miden en píxeles: en tarjetas pequeñas se achican un poco
      uniforms.uSize.value = tamanoBase * MathUtils.clamp(alto / 700, 0.65, 1);
      // Si la tarjeta es angosta, la cámara se aleja para que quepa la forma
      camara.position.z = ancho / alto < 1 ? 13 : 10;
    },
    actualizar(t) {
      const dt = MathUtils.clamp(t - tAnterior, 0, 0.05);
      tAnterior = t;

      if (!QUIETO) uniforms.uTime.value = t;
      const objetivo = QUIETO ? 0 : SECUENCIA[Math.floor(t / SEGUNDOS_POR_FORMA) % SECUENCIA.length];
      morph = MathUtils.damp(morph, objetivo, 2.2, dt);
      uniforms.uMorph.value = morph;

      // El puntero de la escena viene en -1..1 relativo a la tarjeta, igual que NDC
      const raton = uniforms.uMouse.value;
      if (estado.punteroActivo) {
        raton.x = MathUtils.damp(raton.x, estado.punteroLocal.x, 9, dt);
        raton.y = MathUtils.damp(raton.y, estado.punteroLocal.y, 9, dt);
      }
      uniforms.uHover.value = MathUtils.damp(uniforms.uHover.value, estado.punteroActivo ? 1 : 0, 4, dt);

      if (!QUIETO) grupo.rotation.y += dt * 0.07;

      // paralaje de cámara con el ratón dentro de la tarjeta
      const mx = estado.punteroActivo ? estado.punteroLocal.x : 0;
      const my = estado.punteroActivo ? estado.punteroLocal.y : 0;
      camara.position.x = MathUtils.damp(camara.position.x, mx * 0.6, 2.5, dt);
      camara.position.y = MathUtils.damp(camara.position.y, my * 0.4, 2.5, dt);
      camara.lookAt(0, 0, 0);
    },
  };
}
