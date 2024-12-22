import { Polyline } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

interface HistoryTrailProps {
  positions: [number, number][];
}

const HistoryTrail = ({ positions }: HistoryTrailProps) => {
  // Création des segments entre chaque paire de points consécutifs
  const segments = positions.slice(0, -1).map((pos, index) => {
    return [pos, positions[index + 1]];
  });

  // Couleurs pour le dégradé du bleu vers le rouge
  const colors = [
    '#0EA5E9', // Ocean Blue
    '#33C3F0', // Sky Blue
    '#8B5CF6', // Vivid Purple
    '#9b87f5', // Primary Purple
    '#D946EF', // Magenta Pink
    '#ea384c'  // Red
  ];

  // Calcul de la couleur pour chaque segment en fonction de sa position
  const getSegmentColor = (index: number) => {
    const position = index / (segments.length - 1);
    const colorIndex = Math.floor(position * (colors.length - 1));
    return colors[Math.min(colorIndex, colors.length - 1)];
  };

  return (
    <>
      {segments.map((segment, index) => (
        <Polyline
          key={`segment-${index}`}
          positions={segment as LatLngExpression[]}
          color={getSegmentColor(index)}
          weight={3}
          opacity={0.8}
        />
      ))}
    </>
  );
};

export default HistoryTrail;