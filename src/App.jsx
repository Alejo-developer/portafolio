import { lazy, Suspense } from "react";
import Escenas3D from "./Escenas3D.jsx";
import { perfil, proyectos, tecnologias, trayectoria } from "./datos.js";

// three.js pesa: la escena se carga aparte para que el texto aparezca primero
const RedNodos = lazy(() => import("./RedNodos.jsx"));

function Navegacion() {
  return (
    <header className="nav">
      <a className="nav-marca" href="#inicio" aria-label="Ir al inicio">
        AJP
      </a>
      <nav aria-label="Secciones">
        <a href="#proyectos">Proyectos</a>
        <a href="#escenas-3d">Escenas 3D</a>
        <a href="#trayectoria">Trayectoria</a>
        <a href="#contacto">Contacto</a>
      </nav>
    </header>
  );
}

function Inicio() {
  return (
    <section id="inicio" className="inicio">
      <Suspense fallback={null}>
        <RedNodos />
      </Suspense>
      <div className="inicio-contenido contenedor">
        <p className="estado">
          <span className="estado-luz" aria-hidden="true" />
          Disponible para práctica profesional
        </p>
        <h1>
          Alejandro
          <br />
          Jiménez Pinzón
        </h1>
        <p className="inicio-texto">
          Desarrollador full-stack junior en Bogotá. Construyo aplicaciones web con Java y Spring Boot, desde la
          base de datos hasta la pantalla, y ya entregué mi primer sitio a un cliente real.
        </p>
        <div className="acciones">
          <a className="boton boton-principal" href="#proyectos">
            Ver proyectos
          </a>
          <a className="boton boton-secundario" href={perfil.hojaDeVida} download>
            Descargar hoja de vida
          </a>
        </div>
      </div>
    </section>
  );
}

function Proyecto({ proyecto }) {
  const esMovil = proyecto.imagenes.length > 1;
  return (
    <article className={`proyecto ${esMovil ? "proyecto-movil" : ""}`} aria-labelledby={`titulo-${proyecto.id}`}>
      <div className="proyecto-texto">
        <p className="proyecto-tipo">{proyecto.tipo}</p>
        <h3 id={`titulo-${proyecto.id}`}>{proyecto.nombre}</h3>
        <p className="proyecto-resumen">{proyecto.resumen}</p>
        <ul className="proyecto-hice">
          {proyecto.hice.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
        <p className="proyecto-stack">
          <span className="sr-only">Tecnologías: </span>
          {proyecto.stack.join(", ")}
        </p>
        <a className="enlace" href={proyecto.enlace.url} target="_blank" rel="noreferrer">
          {proyecto.enlace.texto}
        </a>
      </div>
      <div className="proyecto-imagenes">
        {proyecto.imagenes.map((imagen) => (
          <img key={imagen.src} src={imagen.src} alt={imagen.alt} loading="lazy" decoding="async" />
        ))}
      </div>
    </article>
  );
}

function Proyectos() {
  return (
    <section id="proyectos" className="seccion contenedor">
      <h2>Proyectos</h2>
      <p className="seccion-intro">
        Un sitio para un cliente real, un producto propio publicado, una app Android y el sitio de mi
        emprendimiento. Las escenas 3D de estos proyectos las puedes probar más abajo.
      </p>
      <div className="lista-proyectos">
        {proyectos.map((proyecto) => (
          <Proyecto key={proyecto.id} proyecto={proyecto} />
        ))}
      </div>
    </section>
  );
}

function Tecnologias() {
  return (
    <section id="tecnologias" className="seccion contenedor">
      <h2>Con qué trabajo</h2>
      <p className="seccion-intro">Mi fuerte es el backend en Java. Lo demás lo uso a diario en mis proyectos.</p>
      <dl className="tecnologias">
        {tecnologias.map((grupo) => (
          <div key={grupo.area} className="tecnologia-grupo">
            <dt>{grupo.area}</dt>
            {grupo.items.map((item) => (
              <dd key={item}>{item}</dd>
            ))}
          </div>
        ))}
      </dl>
    </section>
  );
}

function Trayectoria() {
  return (
    <section id="trayectoria" className="seccion contenedor">
      <h2>Trayectoria</h2>
      <ol className="trayectoria">
        {trayectoria.map((hito) => (
          <li key={hito.titulo}>
            <span className="hito-fecha">{hito.fecha}</span>
            <div>
              <h3>{hito.titulo}</h3>
              <p>{hito.detalle}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Contacto() {
  return (
    <section id="contacto" className="seccion contacto contenedor">
      <h2>Hablemos</h2>
      <p className="seccion-intro">
        Busco mi práctica profesional en un equipo de desarrollo. Escríbeme y te respondo pronto.
      </p>
      <a className="contacto-correo" href={`mailto:${perfil.correo}`}>
        {perfil.correo}
      </a>
      <ul className="contacto-redes">
        <li>
          <a className="enlace" href={perfil.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </li>
        <li>
          <a className="enlace" href={perfil.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </li>
        <li>
          <a className="enlace" href={perfil.hojaDeVida} download>
            Hoja de vida en PDF
          </a>
        </li>
      </ul>
    </section>
  );
}

export default function App() {
  return (
    <>
      <a className="saltar" href="#proyectos">
        Saltar a los proyectos
      </a>
      <Navegacion />
      <main>
        <Inicio />
        <Proyectos />
        <Escenas3D />
        <Tecnologias />
        <Trayectoria />
        <Contacto />
      </main>
      <footer className="pie contenedor">
        <p>
          Hecho con React, Vite y three.js.{" "}
          <a className="enlace" href={`${perfil.github}/portafolio`} target="_blank" rel="noreferrer">
            Ver el código
          </a>
        </p>
      </footer>
    </>
  );
}
