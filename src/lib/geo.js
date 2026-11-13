/* One metre frame anchored at a lat/lng. x runs east, y runs SOUTH (SVG's
   y-down), so a drawing built in this frame lines up with north-up
   imagery without any flip. */
export function makeFrame(originLat, originLng) {
  const R = 6378137;
  const cosLat = Math.cos((originLat * Math.PI) / 180);
  return {
    toDraw(lat, lng) {
      return [
        ((lng - originLng) * Math.PI * R * cosLat) / 180,
        -((lat - originLat) * Math.PI * R) / 180,
      ];
    },
    toLL(x, y) {
      return {
        lat: originLat - (y * 180) / (Math.PI * R),
        lng: originLng + (x * 180) / (Math.PI * R * cosLat),
      };
    },
  };
}
