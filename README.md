# Welcome to the RoadWise Project

RoadWise is a project that helps you to drive safely and efficiently:
- it lets you define your destination
- once set, it will track your position and speed
- and detect the curve ahead and provide you optimal speed and assist in braking

You can test the latest version online: https://roadwise-helper.lovable.app/

Note that the project run locally - no information regarding your GPS position is shared online.
Also this is a functional WPA web site, you can easily install the app on your phone.

> ⚠️ **Warning**: This is an educational project. It is not a production ready software, nor something you can trust for driving. Be careful and drive safely, and look at the road, not at your phone.


## Installation

> ⚠️ **Warning**: This project is still in development. Some features might not work as expected, and breaking changes could occur without notice.

Before building the project, make sure you have [Node.js](https://nodejs.org/) installed (version 18 or higher recommended).

Then, follow these steps:

```sh
# Clone the repository
git clone [repository-url]
cd roadwise-helper

# Install dependencies
npm install

# Start the development server
npm run dev
# or
npm start
```

The development server will start at http://localhost:8080

## Available Scripts

- `npm run dev` or `npm start` - Start the development server
- `npm run build` - Build the project for production
- `npm run build:dev` - Build the project in development mode
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run type-check` - Check TypeScript types without building
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run clean` - Clean build artifacts and cache

## Building the Project

To build the project for production:

```sh
# Create a production build
npm run build

# Preview the production build locally
npm run preview
```

The build output will be in the `dist` directory, ready for deployment.


## Technical Documentation

See [docs/tech-overview.md](docs/tech-overview.md) for more details.

> This project is an attempt to test capabilities of AI code generation tools. The main service used to create the application is Lovable (https://lovable.dev). Gemini2 helped for some work on calculations, and also to generate the technical documentation. I also use Cursor & Claude for local editing to fine tune some algorithms.

## What's new

- 27122024: Initial alpha release V0.1 (Sprint 1)
  - This is the first mostly functional version!
  - Will trak your position, speed & acceleration
  - It provides address search as well as point and click direction on map
  - Once you set a destination, it will detect next turn and provide optimal speed to take it
  - turn detection algorithm will detect entry/apex/exit of turn (with the help of Gemini2)
  - display turns on the map
  - display progress bar before entering turn
  - new "drive" view display, very early version, to give a subjective view
  - settings screen to configure various parameters
  - simulation mode to test the app without GPS: it will simulate driving the vehicle while adapting speed to prediction
  - new splash screen with credits (with love!)
  - this is a fully functional PWA app that you can easily install on your phone for on the road use

- 29122024: V0.2 (Sprint 2)
  - First version of the 3D view, using custom code to build the road borders and WebGL to display it in 3D
    - It is very basic, and only display the road borders

## Feeback regaring AI tools

### Using AI for code review and PR

I activated teh free Github copilot version since it offers now a free tier. Unfortunately this is not including the ability to perform a code review for a PR, too bad. And actually I could not find a real solution. Finaly I give a try with Gemini2, since the very large token limit allow to share the code base and a export view of the PR in html. It is kind of interesting, for instance I fixed some perfomance issues with WebGL, but since it is not integrated with the review it is limited.

Note also that Gemini2 tends to hallucinate quite a lot, even when adding the grounding option (so he can still invent references, etc...). For example while looking for a way to rotate the leaflet map, he invented a version 1.10 that would support it eventhough it is not true, and it is common knowledge that leaflet doesn't support it. So, be careful with Gemini2 ideas...

In order to share code with Gemini2 I use a VSCode extension that can geenrate a single markdown page by concatenating all the files in the directory. This is usefull to ask global questions to Gemini2, for instance I asked him to setup a plan to refactor the code. The idea is then to pass the steps to Cursor/Claude to actually perform the work.

Maybe I could find a extension to do the same for PR, by extracting code and diff... but can't find anything usefull yet.

## To Do

### Map display

- [ ] Add a 3D route mode, where drive can see the road ahead in subjective view, with colors indicating braking distance abd other usefull informations...
- [ ] Find a way to rotate the 2D map view, given it is not supported by Leaflet and we want to stick to a free library (not MapBox). Maybe let's try https://www.npmjs.com/package/leaflet-rotate-map for a kind of hack version...

- Have a look at Azure Map ? nice example here integrating with Three.js: https://samples.azuremaps.com/?sample= & https://github.com/Azure-Samples/AzureMapsCodeSamples/blob/main/Samples/3D-layer/three.js/three.js.html

### Raod prediction
- [ ] Display the distance to next trun in arge font so we can easily see it
- [ ] Review the CurveAnalyzer in order to better detect "long curves", especially on high speed road: use some cumulative angular metric to spot them ?
- [ ] Fix the RoadInfo part so we can accurately compute legal speed, detect urban zone entering / exit, Highway...

### Others
- [ ] Add some voice feedback to alert the user that need to brake, next turn, etc...
- [ ] Add feedback analysis: record the driver trip, allow to replay / compare actual speed with prediction
- [ ] Compute a driving safety score based on delta between prediction / actual speed
- [ ] Better metrics for vehcile using IMU ? or estimate lateral acceleration ?
- [ ] Compute a driving economy score based on speed, acceleration, braking, etc... where the score aims to optimize consumption (or autonomy for EV)
- [ ] Build a real native version?
- [ ] Add a "free ride" mode, where the user can drive anywhere, and the app will not provide any speed advice
- [ ] Add a "autonomous driving" mode, where the user can set a destination, and the app will drive there automatically (;))

## Project contribution

This project has been built using Lovable assistant. See https://lovable.dev/projects/a633e3e6-d831-417c-ad56-2d4b003fa9d9

## License

This project is licensed under GNU GENERAL PUBLIC LICENSE - see the [LICENSE](LICENSE) file for details.
