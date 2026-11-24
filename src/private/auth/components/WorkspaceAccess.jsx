import React from "react";
import Icon from "../../shared/components/WorkspaceIcon.jsx";
import { supabase } from "../../shared/services/client";

export default function WorkspaceAccess({ ready, user, authorized, email, setEmail, password, setPassword, busy, error, signIn, signOut }) {
  if (!supabase) return (
    <div className="private-root">
      <div className="private-login">
        <Icon name="lock" size={30}/>
        <h1>Configuración pendiente</h1>
        <p>Configura VITE_SUPABASE_URL y la clave publicable en .env.local.</p>
        <a href="/">Volver al portafolio</a>
      </div>
    </div>
  );

  if (!ready) return <div className="private-root private-loading">Cargando...</div>;

  if (!user) return (
    <main className="private-root private-login-page">
      <div className="private-login">
        <div className="private-brand"><Icon name="lock"/> ESPACIO PERSONAL</div>
        <h1>Tu espacio, tus proyectos.</h1>
        <p>Un panel privado para organizar todo lo que construyes.</p>
        <form onSubmit={signIn}>
          <label>Correo electrónico
            <input type="email" required autoComplete="username"
              value={email} onChange={e=>setEmail(e.target.value)}/>
          </label>
          <label>Contraseña
            <input type="password" required autoComplete="current-password"
              value={password} onChange={e=>setPassword(e.target.value)}/>
          </label>
          {error && <p className="private-error" role="alert">{error}</p>}
          <button className="private-primary" disabled={busy}>
            {busy ? "Ingresando..." : "Entrar a mi espacio"}
          </button>
        </form>
        <a href="/"> Volver al portafolio</a>
      </div>
    </main>
  );

  if (authorized === null) return (
    <main className="private-root private-login-page">
      <div className="private-login" role="status">
        <h1>Verificando acceso...</h1>
        <p>Estamos comprobando tu sesión y permisos.</p>
      </div>
    </main>
  );

  if (!authorized) return (
    <main className="private-root private-login-page">
      <div className="private-login">
        <Icon name="lock" size={30}/>
        <h1>Acceso restringido</h1>
        <p>Esta cuenta no está autorizada o falta configurar el propietario en Supabase.</p>
        {error && <p className="private-error">{error}</p>}
        <button className="private-primary" onClick={signOut}>Cerrar sesión</button>
      </div>
    </main>
  );

  return null;
}
