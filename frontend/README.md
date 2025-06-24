# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


## Running the Frontend

### Environment Setup

- The frontend uses Angular environment files for configuration.
- Edit the following files as needed:
  - `src/environments/environment.ts` for sandbox/development
  - `src/environments/environment.prod.ts` for production

Each file should contain your API URL:
```
export const environment = {
  production: false, // or true for production
  apiUrl: 'http://localhost:3000/api' // Change as needed for your backend
};
```

### Starting the Frontend

- **Sandbox (default):**
  ```
  ng serve
  ```
- **Production build:**
  ```
  ng build --configuration production
  ```

The frontend will automatically use the correct environment file based on the build configuration.