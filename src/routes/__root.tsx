// import reactLogo from "../assets/react.svg";
// import viteLogo from "../assets/vite.svg";
// import icLogo from "../assets/ic.svg";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useAuth } from "@nfid/identitykit/react";

function TopBarIdentity() {
  //const identity = useIdentity();
  const { user, connect: login, disconnect: logout } = useAuth();

  let principalDisplay = "Unknown";
  if (user && user?.principal) {
    try {
      principalDisplay = user.principal.toString();
    } catch (e) {
      principalDisplay = "(error getting principal)";
    }
  }

  const handleLogin = async () => {
    try {
      await login();
    } catch (e) {
      if (
        typeof e === "object" &&
        e !== null &&
        "message" in e &&
        typeof (e as any).message === "string" &&
        (e as any).message === "Tab closed"
      ) {
        // Login cancelled by user
      } else {
        console.error(e);
      }
    }
  };

  return (
    <header className="w-full flex items-center justify-end px-8 text-white gap-4">
      {user ? (
        <>
          <span className="mr-4">
            Principal:{" "}
            <span className="font-mono text-[#e0aaff]">{principalDisplay}</span>
          </span>
          <button
            onClick={logout}
            className="bg-[#e63946] hover:bg-[#b51728] text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </>
      ) : (
        <button
          onClick={handleLogin}
          className="bg-[#7f5af0] hover:bg-[#6241c7] text-white px-4 py-2 rounded"
        >
          Login with NFID
        </button>
      )}
    </header>
  );
}

export const Route = createRootRoute({
  component: () => (
    <main className="dark">
      <div className="flex flex-col gap-14 items-center">
        
        
        <TopBarIdentity />
        <div className="flex gap-5 text-white items-center">
          <Link to="/" className="hover:text-white/70">
            /index
          </Link>
          <Link to="/about" className="hover:text-white/70">
            /about
          </Link>
          <Link to="/bridge" className="hover:text-white/70">
            /bridge
          </Link>
        </div>
        <Outlet />
        <TanStackRouterDevtools />
      </div>
    </main>
  ),
});
