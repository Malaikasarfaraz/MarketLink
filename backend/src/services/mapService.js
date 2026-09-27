function buildMapLink({ latitude, longitude, provider = "OpenStreetMap" }) {
  if (latitude === undefined || longitude === undefined) return null;
  if (provider === "Google Maps") {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

module.exports = { buildMapLink };
