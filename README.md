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

## Project contribution

This project has been built using Lovable assistant. See https://lovable.dev/projects/a633e3e6-d831-417c-ad56-2d4b003fa9d9