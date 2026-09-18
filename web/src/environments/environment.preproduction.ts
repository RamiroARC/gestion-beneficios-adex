// Ambiente PreProduction: Angular compilado servido desde IIS junto a la API .NET.
// Se usan rutas relativas para que funcione detrás del mismo host/binding del sitio IIS,
// evitando hardcodear el dominio del servidor de preproducción.
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  healthUrl: '/api/health'
};
