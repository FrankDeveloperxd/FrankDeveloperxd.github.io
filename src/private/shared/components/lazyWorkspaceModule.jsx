import React from "react";

export default function lazyWorkspaceModule(loader) {
  const Component = React.lazy(loader);

  return function WorkspaceModule(props) {
    return (
      <React.Suspense fallback={
        <div
          role="status"
          style={{
            minHeight: 180,
            display: "grid",
            placeItems: "center",
            color: "#8290a5",
            fontSize: 13
          }}
        >
          Cargando herramienta
        </div>
      }>
        <Component {...props} />
      </React.Suspense>
    );
  };
}
