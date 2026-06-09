const crypto = require("crypto");

// Valida que un evento (webhook) realmente viene de Wompi y no fue alterado.
// Wompi envía un objeto con: data, signature.properties, signature.checksum, timestamp.
// Checksum = SHA256( valores_de_properties + timestamp + secreto_de_eventos )
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

    const properties = body?.signature?.properties || [];
    const receivedChecksum = body?.signature?.checksum;
    const timestamp = body?.timestamp;
    const data = body?.data || {};

    // Toma el valor de cada propiedad indicada (ej. "transaction.status")
    // navegando dentro de "data", y los concatena EN ORDEN.
    const values = properties.map((path) =>
      path.split(".").reduce((obj, key) => (obj ? obj[key] : undefined), data)
    );

    const chain = `${values.join("")}${timestamp}${eventsSecret}`;
    const calculatedChecksum = crypto.createHash("sha256").update(chain).digest("hex");

    if (calculatedChecksum !== receivedChecksum) {
      // Si no coincide, alguien intenta suplantar a Wompi. Rechaza.
      return { statusCode: 401, body: JSON.stringify({ error: "Firma inválida" }) };
    }

    // ✅ Evento legítimo. Aquí actualizas tu pedido según el estado.
    const transaction = data.transaction || {};
    // transaction.status puede ser: APPROVED, DECLINED, VOIDED, ERROR
    console.log("Evento Wompi válido:", transaction.reference, transaction.status);

    // TODO: marcar el pedido como pagado/fallido en tu lógica (DB, correo, etc.)

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
