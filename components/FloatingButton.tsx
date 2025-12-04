"use client";

import { usePathname, useRouter } from "next/navigation";

import { BsPlusCircle } from "react-icons/bs";

export default function FloatingButton() {
    const pathname = usePathname();
    const router = useRouter();

    const rotasPermitidas = ["/dashboard", "/movimentacao", "/relatorios"]; // Rotas onde o botão deve aparecer

    if (!rotasPermitidas.includes(pathname)) { // Verifica se a rota atual está na lista
        return null;
    }

    return (
        <button
        className="fixed bottom-5 right-5 bg-[#1565c0] text-white rounded-full w-[60px] h-[60px] text-[28px]
         flex justify-center items-center cursor-pointer border-none
         shadow-[0_4px_12px_rgba(0,0,0,0.25)]
         transition-transform duration-200 ease-in-out
         hover:scale-110 hover:shadow-[0_6px_16px_rgba(0,0,0,0.35)]
         z-[1000]"
        onClick={() => router.push("/formmovimentacao")}
        >
            <BsPlusCircle />
        </button>
    );
}