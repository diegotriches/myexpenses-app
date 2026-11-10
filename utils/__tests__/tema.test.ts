import { describe, expect, it } from "vitest";
import { proximoTema, rotuloAlternarTema } from "@/utils/tema";

describe("proximoTema", () => {
  it("seguindo o sistema, alterna para o tema oposto e o fixa", () => {
    expect(proximoTema("dark", "dark")).toBe("light");
    expect(proximoTema("light", "light")).toBe("dark");
  });

  it("com o tema fixado no oposto do sistema, volta a seguir o sistema", () => {
    expect(proximoTema("light", "dark")).toBe("system");
    expect(proximoTema("dark", "light")).toBe("system");
  });

  it("sem saber o tema do sistema, alterna entre claro e escuro", () => {
    expect(proximoTema("dark", undefined)).toBe("light");
    expect(proximoTema(undefined, undefined)).toBe("dark");
  });
});

describe("rotuloAlternarTema", () => {
  it("diz o que o clique vai fazer", () => {
    expect(rotuloAlternarTema("dark", "dark")).toBe("Modo claro");
    expect(rotuloAlternarTema("light", "light")).toBe("Modo escuro");
    expect(rotuloAlternarTema("light", "dark")).toBe("Seguir o tema do sistema");
  });
});
