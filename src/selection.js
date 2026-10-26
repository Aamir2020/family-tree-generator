export function selectionRectangle(startX, startY, endX, endY) {
  return { x: Math.min(startX, endX), y: Math.min(startY, endY), width: Math.abs(endX - startX), height: Math.abs(endY - startY) };
}

// The marquee lives in viewport coordinates; cards are stored in world coordinates.
export function peopleInRectangle(people, rectangle, pan, zoom) {
  if (rectangle.width < 4 || rectangle.height < 4) return [];
  return people.filter(person => {
    const left = pan.x + person.x * zoom;
    const top = pan.y + person.y * zoom;
    const right = left + 220 * zoom;
    const bottom = top + 132 * zoom;
    return right >= rectangle.x && left <= rectangle.x + rectangle.width
      && bottom >= rectangle.y && top <= rectangle.y + rectangle.height;
  }).map(person => person.id);
}

export function movePeople(people, ids, originalPositions, dx, dy, zoom) {
  const selected = new Set(ids);
  return people.map(person => selected.has(person.id)
    ? { ...person, x: originalPositions.get(person.id).x + dx / zoom, y: originalPositions.get(person.id).y + dy / zoom }
    : person);
}
