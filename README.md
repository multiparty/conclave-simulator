# Conclave Simulator
Interactive web-based simulator for the Conclave framework.

## Project Layout

    ├─ src/           Source functionalities
    ├─ tests/         Test suite
    │  └─ conclave/     Workflows to test resulting data
    │  └─ policy/       Workflow validation tests
    ├─ web/           UI root
    │  └─ src/          Simulator include files
    │  └─ dist/         Browser simulator bundle (simulator.js)

## Running the Prototype
Go to `web/index.html` in a browser.

### Developing
To make any changes active, compile them to the simulator bundle in `web/dist/simulator.js`.
```shell
browserify src/simulator.js --debug --s simulator -o dist/simulator.js
```
