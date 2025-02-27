# Welcome to the RoadWise Project

RoadWise is a project that helps you to drive safely and efficiently:
- it lets you define your destination
- once set, it will track your position and speed
- and detect the curve ahead and provide you optimal speed and assist in braking

You can test the latest stable version online: https://roadwise-app.netlify.app/
or the development version: https://roadwise-helper.lovable.app/

Note that the project run locally - no information regarding your GPS position is shared online.
Also this is a functional WPA web site, you can easily install the app on your phone.

> ⚠️ **Warning**: This is an educational project. It is not a production ready software, nor something you can trust for driving. Be careful and drive safely, and look at the road, not at your phone.


## Installation

> ⚠️ **Warning**: This project is still in development. Some features might not work as expected, and breaking changes could occur without notice.

Before building the project, make sure you have [Node.js](https://nodejs.org/) installed (version 18 or higher recommended).

```sh
# Install Node.js
brew install node
```

Then, follow these steps:

```sh
# Clone the repository
git clone [repository-url]
cd roadwise

# Install dependencies
npm install

# Start the development server
npm run dev
```

The development server will start at http://localhost:8080

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

- 05012025: version 0.2 (Sprint 2)
  - updated "drive" view, now display a real road in 3D using WebGl and three.js
  - optimisation to better handle memory, but still lot to do
  - partial refactoring to rely more on services (still some work in progress)
  - better display of the next turn distance
  - known bug: the turn distance indicator doesn't work in Drive view mode

## To Do

- [ ] Add a 3D route mode, where drive can see the road ahead in subjective view, with colors indicating braking distance abd other usefull informations...
  - [x] create a real 3D view of the road
  - [ ] add some colors and info to display distance for brake, turn, best trajectory, etc...
  - [ ] display some real 3D view instead of just wireframe
- [x] Display the distance to next trun in large font so we can easily see it
- [ ] Review the CurveAnalyzer in order to better detect "long curves", especially on high speed road: use some cumulative angular metric to spot them ?
- [ ] Add some voice feedback to alert the user that need to brake, next turn, etc...
- [ ] Fix the RoadInfo part so we can accurately compute legal speed, detect urban zone entering / exit, Highway...
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
