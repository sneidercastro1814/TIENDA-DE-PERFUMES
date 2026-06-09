const crypto = require("crypto");

// Genera la firma de integridad de Wompi EN EL SERVIDOR.
// El secreto nunca toca el navegador.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const {
      reference,
      amountInCents,
      currency = "COP",
      expirationTime, // opcional (ISO 8601), solo si usas expiración
    } = JSON.parse(event.body || "{}");

    if (!reference || !amountInCents) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "reference y amountInCents son obligatorios" }),
      };
    }

    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    if (!integritySecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Falta WOMPI_INTEGRITY_SECRET en el servidor" }),
      };
    }

    // EL ORDEN IMPORTA:
    // referencia + monto_en_centavos + moneda + (expiración opcional) + secreto
    const chain = expirationTime
      ? `${reference}${amountInCents}${currency}${expirationTime}${integritySecret}`
      : `${reference}${amountInCents}${currency}${integritySecret}`;

    const signature = crypto.createHash("sha256").update(chain).digest("hex");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, reference, amountInCents, currency }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
