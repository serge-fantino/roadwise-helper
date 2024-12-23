# Welcome to the RoadWise Project

RoadWise is a project that helps you to drive safely and efficiently:
- it lets you define your destination
- once set, it will track your position and speed
- and detect the curve ahead and provide you optimal speed and assist in braking

You can test the latest version online: https://roadwise-helper.lovable.app/

Note that the project run locally - no information regarding your GPS position is shared online.
Also this is a functional WPA web site, you can easily install the app on your phone.


## Installation

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


## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Leaflet for map integration
- TanStack Query for data fetching

## Project contribution

This project has been built using Lovable assistant. See https://lovable.dev/projects/a633e3e6-d831-417c-ad56-2d4b003fa9d9