import { Polyline } from 'react-leaflet';
import { TurnPrediction } from '../../services/prediction/PredictionTypes';

interface TurnCurveOverlayProps {
  turns: TurnPrediction[];
}

const getTurnColor = (radius: number): string => {
  // Les seuils sont en mètres
  if (radius > 100) {
    return '#F2FCE2'; // Vert doux pour les virages larges
  } else if (radius > 50) {
    return '#FEF7CD'; // Jaune doux pour les virages moyens
  } else if (radius > 25) {
    return '#FEC6A1'; // Orange doux pour les virages serrés
  } else if (radius > 10) {
    return '#F97316'; // Orange vif pour les virages très serrés
  } else {
    return '#ea384c'; // Rouge pour les virages dangereux
  }
};

const TurnCurveOverlay = ({ turns }: TurnCurveOverlayProps) => {
  return (
    <>
      {turns.map((turn, index) => (
        <Polyline
          key={`curve-${index}`}
          positions={turn.curveInfo.curvePoints}
          pathOptions={{
            color: getTurnColor(turn.curveInfo.radius),
            weight: 10,
            opacity: 0.9,
            dashArray: undefined
          }}
        />
      ))}
    </>
  );
};

export default TurnCurveOverlay;