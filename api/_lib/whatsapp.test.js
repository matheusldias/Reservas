import { describe, it, expect } from "vitest";
import { buildMessagePayload, verifyMetaSignature } from "./whatsapp.js";
import crypto from "node:crypto";

describe("buildMessagePayload", () => {
  it("usa texto livre quando a janela está aberta e há texto", () => {
    const p = buildMessagePayload({
      phone: "5547999999999",
      windowOpen: true,
      text: "Sua mesa está pronta!",
      template: { name: "fila_chamada", params: ["Ana", "2"] },
    });
    expect(p).toEqual({
      messaging_product: "whatsapp",
      to: "5547999999999",
      type: "text",
      text: { body: "Sua mesa está pronta!" },
    });
  });

  it("usa template quando a janela está fechada", () => {
    const p = buildMessagePayload({
      phone: "5547999999999",
      windowOpen: false,
      text: "Sua mesa está pronta!",
      template: { name: "fila_chamada", params: ["Ana", "2"] },
    });
    expect(p.type).toBe("template");
    expect(p.template.name).toBe("fila_chamada");
    expect(p.template.language).toEqual({ code: "pt_BR" });
    expect(p.template.components).toEqual([
      { type: "body", parameters: [
        { type: "text", text: "Ana" },
        { type: "text", text: "2" },
      ] },
    ]);
  });

  it("usa template quando não há texto, mesmo com janela aberta", () => {
    const p = buildMessagePayload({
      phone: "5547999999999",
      windowOpen: true,
      template: { name: "fila_chamada", params: ["Ana", "2"] },
    });
    expect(p.type).toBe("template");
  });
});

describe("verifyMetaSignature", () => {
  it("aceita assinatura válida", () => {
    const body = '{"a":1}';
    const secret = "segredo";
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyMetaSignature(body, sig, secret)).toBe(true);
  });

  it("rejeita assinatura inválida", () => {
    expect(verifyMetaSignature('{"a":1}', "sha256=deadbeef", "segredo")).toBe(false);
  });

  it("rejeita header ausente", () => {
    expect(verifyMetaSignature('{"a":1}', undefined, "segredo")).toBe(false);
  });
});
