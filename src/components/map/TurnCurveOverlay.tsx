import { Polyline } from 'react-leaflet';
import { TurnPrediction } from '../../services/prediction/PredictionTypes';

interface TurnCurveOverlayProps {
  turns: TurnPrediction[];
}

const TurnCurveOverlay = ({ turns }: TurnCurveOverlayProps) => {
  return (
    <>
      {turns.map((turn, index) => (
        <Polyline
          key={`curve-${index}`}
          positions={turn.curvePoints}
          pathOptions={{
            color: index === 0 ? '#3B82F6' : '#60A5FA',
            weight: 4,
            opacity: index === 0 ? 0.8 : 0.5,
            dashArray: index === 0 ? undefined : '5, 10'
          }}
        />
      ))}
    </>
  );
};

export default TurnCurveOverlay;