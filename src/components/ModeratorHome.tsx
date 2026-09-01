import Link from "next/link";
import Image from "next/image";
import { logoutAdminAction } from "@/app/admin/actions";

/**
 * Lo que ve en /admin alguien con rol `moderator`.
 *
 * Su cuenta existe solo para que el chat lo reconozca: no gestiona contenido,
 * ni tarifas, ni demos. En vez de enseñarle un panel recortado lleno de cosas
 * que no puede tocar, se le explica qué tiene que hacer y se le manda al sitio.
 */
export default function ModeratorHome({ name }: { name: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-20 bg-mesh-brand">
      <div className="glass rounded-[2.5rem] p-10 sm:p-14 border-white/10 shadow-2xl max-w-lg w-full text-center">
        <Image
          src="/logos-bonchona/92.png"
          alt="Bonchona"
          className="h-14 w-auto mx-auto mb-8 opacity-80"
          width={56}
          height={56}
        />

        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-bonchona-red mb-3">
          Moderador de chat
        </p>
        <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-white leading-none mb-5">
          Hola, {name}
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed font-medium mb-10">
          Tu cuenta modera el chat en vivo. No hace falta que hagas nada aquí: abre el sitio,
          entra al chat desde la barra de música y podrás borrar mensajes, pausar la sala y
          expulsar a quien haga falta.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-7 py-3.5 rounded-full bg-bonchona-red text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.03] transition-transform shadow-[0_20px_40px_rgba(232,75,50,0.3)]"
          >
            Ir al chat
          </Link>
          <form
            action={async () => {
              "use server";
              await logoutAdminAction();
            }}
          >
            <button
              type="submit"
              className="w-full px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
