# Welcome to the RoadWise Project

RoadWise is a project that helps you to drive safely and efficiently:
- it lets you define your destination
- once set, it will track your position and speed
- and detect the curve ahead and provide you optimal speed and assist in braking

You can test the latest stable version online: https://roadwise-app.netlify.app/

Note that the project run locally - no information regarding your GPS position is shared online.
Also this is a functional PWA web site, you can easily install the app on your phone.

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

> This project is an attempt to test capabilities of AI code generation tools. The application was first created with Lovable, and is now developed with Claude through La Fabrique extraordinaire (see [CLAUDE.md](CLAUDE.md)). Gemini2 helped for some work on calculations, and also to generate the technical documentation. I also use Cursor & Claude for local editing to fine tune some algorithms.

## What's new

See the release notes: [docs/release-notes.json](docs/release-notes.json).

## Feedback regarding AI tools

### Using AI for code review and PR

I activated the free GitHub Copilot tier, but it does not include code review for PRs. I tried Gemini (large context) by exporting the codebase / diffs, which helped spot some issues, but it’s not integrated into the PR workflow.

Note: Gemini can hallucinate even with grounding. Example: it suggested Leaflet v1.10 supports map rotation natively (it doesn’t). So treat suggestions as hypotheses and verify them.

To share code with Gemini, a VSCode extension can generate a single markdown page by concatenating files. This is useful for global questions (architecture/refactor plans), then execute the steps locally (Cursor/Claude).

## To Do

### Map display

- [ ] Add a 3D route mode, where drive can see the road ahead in subjective view, with colors indicating braking distance abd other usefull informations...
  - [x] create a real 3D view of the road
  - [ ] add some colors and info to display distance for brake, turn, best trajectory, etc...
  - [ ] display some real 3D view instead of just wireframe
- [x] Display the distance to next trun in large font so we can easily see it
- [ ] Find a way to rotate the 2D map view (Leaflet doesn’t support it natively). Maybe try `leaflet-rotate-map`.
- [ ] Have a look at Azure Maps examples integrating with Three.js

### Road prediction
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

Changes go through one pull request per story to `master`, checked by CI; see [CLAUDE.md](CLAUDE.md).

## License

This project is licensed under GNU GENERAL PUBLIC LICENSE - see the [LICENSE](LICENSE) file for details.
