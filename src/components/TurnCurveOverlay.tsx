import { Polyline } from 'react-leaflet';
import { TurnPrediction } from '../services/prediction/PredictionTypes';

interface TurnCurveOverlayProps {
  turns: TurnPrediction[];
}

const TurnCurveOverlay = ({ turns }: TurnCurveOverlayProps) => {
  return (
    <>
      {turns.map((turn, index) => (
        <Polyline
          key={index}
          positions={turn.curvePoints}
          pathOptions={{
            color: 'red',
            weight: 4,
            opacity: 0.7
          }}
        />
      ))}
    </>
  );
};

export default TurnCurveOverlay; 