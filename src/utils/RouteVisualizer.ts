import fs from 'fs';
import path from 'path';
import { CartesianPoint } from '../services/RouteProjectionService';

export function saveRoutePlot(result: { path: CartesianPoint[], leftBorder: CartesianPoint[], rightBorder: CartesianPoint[] }, filename: string) {
    const html = `
      <!DOCTYPE html>
      <html style="height: 100%; margin: 0;">
        <head>
          <title>Route Projection Test</title>
          <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
          <style>
            body {
              height: 100%;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            #plot {
              height: 100%;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div id="plot"></div>
          <script>
            const traces = [
              {
                x: ${JSON.stringify(result.path.map(p => p.x))},
                y: ${JSON.stringify(result.path.map(p => p.y))},
                mode: 'lines+markers',
                name: 'Path',
                line: { color: 'blue', width: 2 },
                marker: { size: 8 }
              },
              {
                x: ${JSON.stringify(result.leftBorder.map(p => p.x))},
                y: ${JSON.stringify(result.leftBorder.map(p => p.y))},
                mode: 'lines',
                name: 'Left Border',
                line: { color: 'red', width: 1 }
              },
              {
                x: ${JSON.stringify(result.rightBorder.map(p => p.x))},
                y: ${JSON.stringify(result.rightBorder.map(p => p.y))},
                mode: 'lines',
                name: 'Right Border',
                line: { color: 'green', width: 1 }
              }
            ];

            const layout = {
              title: 'Route Projection Visualization',
              showlegend: true,
              xaxis: { title: 'X (meters)' },
              yaxis: { title: 'Y (meters)', scaleanchor: 'x', scaleratio: 1 },
              margin: { t: 50, b: 50, l: 50, r: 50 }
            };

            Plotly.newPlot('plot', traces, layout, {
              responsive: true
            });
          </script>
        </body>
      </html>
    `;

    // Sauvegarder la visualisation
    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outputDir, `${filename}.html`), html);
}