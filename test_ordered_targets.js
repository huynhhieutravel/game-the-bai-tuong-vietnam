function getOrderedTargets(sourceId, targets) {
  const players = [{id: 0}, {id: 1}, {id: 2}, {id: 3}];
  const sourceIndex = players.findIndex(p => p.id === sourceId);
  const total = players.length;
  
  const ordered = targets.map(tId => {
    const tIndex = players.findIndex(p => p.id === tId);
    let distance = tIndex - sourceIndex;
    if (distance < 0) distance += total;
    return { id: tId, distance };
  });

  ordered.sort((a, b) => a.distance - b.distance);
  return ordered.map(t => t.id);
}

console.log(getOrderedTargets(1, [0, 1, 2, 3]));
