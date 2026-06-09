// Crea una orden en Addi del lado servidor.
// Paso 1: pide un token (OAuth2 client_credentials) con client_id + client_secret.
// Paso 2: crea la orden y devuelve la URL de checkout a la que rediriges al cliente.
//
// IMPORTANTE: ADDI_AUTH_URL, ADDI_API_URL y ADDI_AUDIENCE vienen en el correo
// de onboarding que Addi te envía como comercio aliado (integraciones@addi.com).
// La ESTRUCTURA del payload de la orden también la define ese documento.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const order = JSON.parse(event.body || "{}");

    // 1) Token de acceso
    const tokenRes = await fetch(process.env.ADDI_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.ADDI_CLIENT_ID,
        client_secret: process.env.ADDI_CLIENT_SECRET,
        audience: process.env.ADDI_AUDIENCE,
        grant_type: "client_credentials",
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: "Error obteniendo token Addi", detail }) };
    }

    const { access_token } = await tokenRes.json();

    // 2) Crear la orden / checkout
    const orderRes = await fetch(`${process.env.ADDI_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      // Ajusta los campos exactos según tu documentación de Addi.
      body: JSON.stringify(order),
    });

    const result = await orderRes.json();

    if (!orderRes.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: "Error creando orden Addi", detail: result }) };
    }

    // Addi devuelve una URL de redirección al checkout (campo según docs).
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
