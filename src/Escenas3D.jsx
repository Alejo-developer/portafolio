import { useEffect, useRef } from "react";
import { escenas3d } from "./datos.js";

// Monta la escena cuando la tarjeta se acerca a la pantalla, para no cargar
// three.js ni crear los lienzos hasta que hagan falta.
function Lienzo({ nombre }) {
  const cajaRef = useRef(null);

  useEffect(() => {
    const caja = cajaRef.current;
    let desmontar = null;
    let cancelado = false;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return;
        observador.disconnect();
        import("./escenas/escenasFya.js").then(({ montarEscena }) => {
          if (!cancelado) desmontar = montarEscena(caja, nombre);
        });
      },
      { rootMargin: "400px 0px" },
    );
    observador.observe(caja);

    return () => {
      cancelado = true;
      observador.disconnect();
      desmontar?.();
    };
  }, [nombre]);

  return <div ref={cajaRef} className="escena-lienzo" aria-hidden="true" />;
}

export default function Escenas3D() {
  return (
    <section id="escenas-3d" className="seccion contenedor">
      <h2>Escenas 3D</h2>
      <p className="seccion-intro">
        Diseño escenas con three.js para que las webs se sientan vivas sin depender de videos pesados. Estas cuatro las
        hice para FyA y siguen funcionando en sus sitios. <span className="solo-raton">Pasa el ratón por encima.</span>
      </p>
      <div className="escenas">
        {escenas3d.map((escena) => (
          <figure key={escena.id} className={`escena escena-${escena.id}`}>
            <div className={`escena-marco fondo-${escena.fondo}`}>
              <Lienzo nombre={escena.id} />
            </div>
            <figcaption>
              <p className="proyecto-tipo">{escena.dondeSeUsa}</p>
              <h3>{escena.nombre}</h3>
              <p className="escena-descripcion">{escena.descripcion}</p>
              <p className="escena-tecnicas">{escena.tecnicas}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
